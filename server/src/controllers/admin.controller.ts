import { Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { AuthRequest, logAudit } from '../middleware/auth.js';
import { AvailabilityStatus, BookingStatus, DestinationStatus, Role, TravellerStatus, VerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function getAdminOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const totalSchools = await prisma.school.count();
    const verifiedSchools = await prisma.school.count({ where: { verificationStatus: VerificationStatus.VERIFIED } });
    const pendingSchools = await prisma.school.count({ where: { verificationStatus: VerificationStatus.PENDING } });

    const totalDestinations = await prisma.destination.count();
    const publishedDestinations = await prisma.destination.count({ where: { status: DestinationStatus.PUBLISHED } });
    const pendingApprovalDestinations = await prisma.destination.count({ where: { status: DestinationStatus.PENDING_APPROVAL } });
    const draftDestinations = await prisma.destination.count({ where: { status: DestinationStatus.DRAFT } });
    const archivedDestinations = await prisma.destination.count({ where: { status: DestinationStatus.ARCHIVED } });

    const totalBookings = await prisma.booking.count();
    const pendingBookings = await prisma.booking.count({ where: { status: BookingStatus.SUBMITTED } });
    const acceptedBookings = await prisma.booking.count({ where: { status: { in: [BookingStatus.ACCEPTED, BookingStatus.CONFIRMED] } } });
    const rejectedBookings = await prisma.booking.count({ where: { status: BookingStatus.REJECTED } });

    // Traveller service requests counts
    const totalTravellerRequests = await prisma.travellerServiceRequest.count();
    const newTravellerRequests = await prisma.travellerServiceRequest.count({ where: { status: TravellerStatus.NEW } });
    const inProgressTraveller = await prisma.travellerServiceRequest.count({
      where: { status: { in: [TravellerStatus.UNDER_REVIEW, TravellerStatus.SOURCING_TRANSPORT, TravellerStatus.QUOTE_PREPARED] } },
    });
    const confirmedTraveller = await prisma.travellerServiceRequest.count({ where: { status: TravellerStatus.CONFIRMED } });

    // Booking value
    const bookings = await prisma.booking.findMany({
      where: { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] } },
      select: { originalQuoteAmount: true, confirmedQuoteAmount: true },
    });
    const totalEstimatedValue = bookings.reduce((sum, b) => sum + (b.confirmedQuoteAmount || b.originalQuoteAmount), 0);

    // Recent system activity
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { name: true, role: true } } },
    });

    res.json({
      success: true,
      data: {
        schools: { total: totalSchools, verified: verifiedSchools, pending: pendingSchools },
        destinations: {
          total: totalDestinations,
          published: publishedDestinations,
          pendingApproval: pendingApprovalDestinations,
          draft: draftDestinations,
          archived: archivedDestinations,
        },
        bookings: { total: totalBookings, pending: pendingBookings, accepted: acceptedBookings, rejected: rejectedBookings },
        traveller: { total: totalTravellerRequests, new: newTravellerRequests, inProgress: inProgressTraveller, confirmed: confirmedTraveller },
        totalEstimatedValue,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
}

// DESTINATION MANAGEMENT
export async function listAllDestinations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinations = await prisma.destination.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        ticketTypes: true,
        staff: { include: { user: true } },
        _count: { select: { bookings: true } },
      },
    });

    res.json({
      success: true,
      data: destinations,
    });
  } catch (error) {
    next(error);
  }
}

export async function onboardDestination(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      name,
      businessName,
      category,
      description,
      address,
      city,
      state,
      pincode,
      officialEmail,
      contactPhone,
      managerName,
      managerEmail,
      managerPassword,
      minGroupSize,
      maxGroupSize,
      openingTime,
      closingTime,
      studentTicketPrice,
      teacherTicketPrice,
    } = req.body;

    if (!name || !businessName || !category || !city || !officialEmail || !managerEmail) {
      throw new AppError('Please provide all necessary destination onboarding information.', 400);
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
    const passwordHash = await bcrypt.hash(managerPassword || 'Password123!', 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or connect manager user
      let user = await tx.user.findUnique({ where: { email: managerEmail.toLowerCase().trim() } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: managerEmail.toLowerCase().trim(),
            passwordHash,
            name: managerName || 'Destination Manager',
            phone: contactPhone,
            role: Role.DESTINATION_MANAGER,
            emailVerified: true,
            isActive: true,
          },
        });
      }

      // 2. Create destination
      const dest = await tx.destination.create({
        data: {
          name,
          businessName,
          slug,
          category,
          description: description || `Welcome to ${name}, an educational and recreation venue for school trips.`,
          address: address || `${city}, ${state}`,
          city,
          state,
          pincode: pincode || '141001',
          officialEmail: officialEmail.toLowerCase().trim(),
          contactPhone,
          managerName,
          googleProfile: req.body.googleProfile ? String(req.body.googleProfile).trim() : null,
          website: req.body.website ? String(req.body.website).trim() : null,
          guideAvailable: req.body.guideAvailable === true || req.body.guideAvailable === 'true' || req.body.guideNeeded === true || req.body.guideNeeded === 'true' || req.body.guideNeeded === 'yes',
          status: DestinationStatus.PUBLISHED,
          isVerified: true,
          minGroupSize: minGroupSize ? parseInt(minGroupSize, 10) : 25,
          maxGroupSize: maxGroupSize ? parseInt(maxGroupSize, 10) : 1000,
          openingTime: openingTime || '09:30',
          closingTime: closingTime || '18:00',
        },
      });

      // 3. Link staff
      await tx.destinationStaff.create({
        data: {
          destinationId: dest.id,
          userId: user.id,
          role: 'MANAGER',
        },
      });

      // 4. Create base ticket types
      const sPrice = studentTicketPrice ? parseFloat(studentTicketPrice) : 350;
      const tPrice = teacherTicketPrice ? parseFloat(teacherTicketPrice) : 250;

      await tx.ticketType.createMany({
        data: [
          {
            destinationId: dest.id,
            name: 'Ticket per Student',
            category: 'STUDENT',
            basePrice: sPrice,
            complimentaryStaffRatio: 15,
            minQuantity: dest.minGroupSize,
            maxQuantity: dest.maxGroupSize,
          },
          {
            destinationId: dest.id,
            name: 'Ticket per Teacher',
            category: 'TEACHER',
            basePrice: tPrice,
            complimentaryStaffRatio: 0,
            minQuantity: 0,
            maxQuantity: 100,
          },
        ],
      });

      // 5. Create basic operating hours for all 7 days
      for (let day = 0; day < 7; day++) {
        await tx.destinationOperatingHours.create({
          data: {
            destinationId: dest.id,
            dayOfWeek: day,
            isOpen: true,
            openTime: dest.openingTime,
            closeTime: dest.closingTime,
          },
        });
      }

      return { dest, user };
    });

    await logAudit(req.user!.userId, 'DESTINATION_ONBOARDED', 'Destination', result.dest.id, `Admin onboarded new destination: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Destination successfully onboarded and published.',
      data: result.dest,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDestinationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { status, isVerified, reason } = req.body;

    const computedIsVerified = isVerified !== undefined ? isVerified : (status === DestinationStatus.PUBLISHED ? true : undefined);

    const updated = await prisma.destination.update({
      where: { id },
      data: {
        status: status as DestinationStatus,
        isVerified: computedIsVerified,
      },
    });

    const auditMessage = `Updated destination status to ${status}${reason ? `. Reason: ${reason}` : ''}`;
    await logAudit(req.user!.userId, 'DESTINATION_STATUS_UPDATED', 'Destination', id, auditMessage);

    // Notify destination staff members
    const staffMembers = await prisma.destinationStaff.findMany({
      where: { destinationId: id },
      select: { userId: true },
    });
    for (const st of staffMembers) {
      await prisma.notification.create({
        data: {
          userId: st.userId,
          title: `Venue Status Updated: ${status}`,
          message: reason || `Your destination listing "${updated.name}" has been updated to ${status}.`,
          type: 'INFO',
          link: '/destination',
        },
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Super Admin updates destination availability and capacity for a specific date
 */
export async function updateAdminDestinationAvailability(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.params.id as string;
    const { date, status, dailyCapacity, notes } = req.body;
    if (!date) throw new AppError('Date is required', 400);

    const dest = await prisma.destination.findUnique({
      where: { id: destinationId },
      select: { id: true, name: true, maxGroupSize: true },
    });
    if (!dest) throw new AppError('Destination not found', 404);

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const record = await prisma.destinationAvailability.upsert({
      where: {
        destinationId_date: {
          destinationId,
          date: targetDate,
        },
      },
      update: {
        status: status as AvailabilityStatus,
        dailyCapacity: dailyCapacity !== undefined ? parseInt(String(dailyCapacity), 10) : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      create: {
        destinationId,
        date: targetDate,
        status: (status as AvailabilityStatus) || AvailabilityStatus.AVAILABLE,
        dailyCapacity: dailyCapacity !== undefined ? parseInt(String(dailyCapacity), 10) : (dest.maxGroupSize || 800),
        notes: notes || null,
      },
    });

    await logAudit(
      req.user!.userId,
      'CALENDAR_AVAILABILITY_UPDATED',
      'DestinationAvailability',
      record.id,
      `Date ${date} marked as ${status} for ${dest.name}`
    );

    res.json({
      success: true,
      message: 'Availability updated successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Super Admin Proposal Review & Processing
 * Approves (publishes), Requests Changes (sets DRAFT), or Rejects (archives) a proposal with notifications and audit history.
 */
export async function processDestinationProposal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    let action = String(req.body.action || req.body.decision || '').toUpperCase();
    if (action === 'APPROVED') action = 'APPROVE';
    if (action === 'CHANGES_REQUESTED') action = 'REQUEST_CHANGES';
    if (action === 'REJECTED') action = 'REJECT';
    const reason = req.body.reason || req.body.notes || '';

    if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(action)) {
      throw new AppError('Invalid proposal action. Allowed: APPROVE, REJECT, REQUEST_CHANGES', 400);
    }

    let targetStatus: DestinationStatus;
    let isVerified = false;
    let actionTitle = '';

    if (action === 'APPROVE') {
      targetStatus = DestinationStatus.PUBLISHED;
      isVerified = true;
      actionTitle = 'Approved & Published';
    } else if (action === 'REQUEST_CHANGES') {
      targetStatus = DestinationStatus.DRAFT;
      isVerified = false;
      actionTitle = 'Changes Requested';
    } else {
      targetStatus = DestinationStatus.ARCHIVED;
      isVerified = false;
      actionTitle = 'Rejected';
    }

    const updated = await prisma.destination.update({
      where: { id },
      data: {
        status: targetStatus,
        isVerified,
      },
    });

    const auditDetail = `Destination proposal ${actionTitle} by Admin. Reason: ${reason || 'No additional notes provided'}`;
    await logAudit(req.user!.userId, `DESTINATION_PROPOSAL_${action}`, 'Destination', id, auditDetail);

    // Notify linked destination staff
    const staffMembers = await prisma.destinationStaff.findMany({
      where: { destinationId: id },
      select: { userId: true },
    });

    for (const st of staffMembers) {
      await prisma.notification.create({
        data: {
          userId: st.userId,
          title: `Venue Proposal: ${actionTitle}`,
          message: reason || `Your venue proposal for "${updated.name}" has been ${actionTitle.toLowerCase()} by administration.`,
          type: 'INFO',
          link: '/destination',
        },
      });
    }

    res.json({
      success: true,
      message: `Destination proposal ${actionTitle.toLowerCase()} successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// SCHOOL MANAGEMENT
export async function listAllSchools(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        staff: { include: { user: true } },
        _count: { select: { bookings: true } },
      },
    });

    res.json({
      success: true,
      data: schools,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSchoolVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { verificationStatus, verificationNotes } = req.body;

    const validStatuses = ['VERIFIED', 'PENDING', 'REJECTED'];
    if (typeof verificationStatus !== 'string' || !validStatuses.includes(verificationStatus)) {
      throw new AppError(`Invalid verification status. Allowed: ${validStatuses.join(', ')}`, 400);
    }
    if (verificationStatus !== 'VERIFIED' && (!verificationNotes || typeof verificationNotes !== 'string' || !verificationNotes.trim())) {
      throw new AppError(
        verificationStatus === 'REJECTED'
          ? 'A rejection reason is required.'
          : 'A message describing the requested changes is required.',
        400
      );
    }

    const school = await prisma.school.findUnique({ where: { id }, select: { id: true } });
    if (!school) throw new AppError('School not found', 404);

    const updated = await prisma.school.update({
      where: { id },
      data: {
        verificationStatus: verificationStatus as VerificationStatus,
        verificationNotes: verificationNotes?.trim() || null,
        updatedAt: new Date(),
      },
    });

    const auditDetail = `School verification updated to ${verificationStatus}${verificationNotes ? `. Notes: ${verificationNotes}` : ''}`;
    await logAudit(req.user!.userId, 'SCHOOL_VERIFICATION_UPDATED', 'School', id, auditDetail);

    // Notify school staff members
    const staffMembers = await prisma.schoolStaff.findMany({
      where: { schoolId: id },
      select: { userId: true },
    });
    for (const st of staffMembers) {
      await prisma.notification.create({
        data: {
          userId: st.userId,
          title: `School Verification: ${verificationStatus === 'VERIFIED' ? 'Approved' : verificationStatus === 'REJECTED' ? 'Verification Rejected' : 'Under Review'}`,
          message: verificationNotes || `Your school profile verification status has been updated to ${verificationStatus}.`,
          type: 'INFO',
          link: '/school',
        },
      });
    }

    res.json({
      success: true,
      message: `School verification updated to ${verificationStatus}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// GLOBAL BOOKINGS TABLE
export async function listAllBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, search } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { bookingReference: { contains: search, mode: 'insensitive' } },
        { school: { name: { contains: search, mode: 'insensitive' } } },
        { destination: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        school: { select: { id: true, name: true, city: true, contactPhone: true } },
        destination: { select: { id: true, name: true, city: true } },
        travellerRequest: { select: { id: true, status: true, quoteAmount: true, preferredVehicle: true } },
      },
    });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

// DEDICATED TRAVELLER-SERVICE REQUESTS QUEUE (Admin-only)
export async function listTravellerRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.travellerServiceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        school: { select: { id: true, name: true, contactPhone: true, contactPerson: true } },
        destination: { select: { id: true, name: true, city: true } },
        booking: { select: { id: true, bookingReference: true, visitDate: true, totalGroupSize: true, status: true } },
        assignedAdmin: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTravellerRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const {
      status,
      assignedAdminId,
      vehicleDetails,
      quoteAmount,
      adminNotes,
    } = req.body;

    const existing = await prisma.travellerServiceRequest.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!existing) throw new AppError('Traveller request not found', 404);

    const updated = await prisma.$transaction(async (tx) => {
      const tr = await tx.travellerServiceRequest.update({
        where: { id },
        data: {
          status: status ? (status as TravellerStatus) : undefined,
          assignedAdminId: assignedAdminId || req.user?.userId,
          vehicleDetails: vehicleDetails !== undefined ? vehicleDetails : undefined,
          quoteAmount: quoteAmount !== undefined ? parseFloat(quoteAmount) : undefined,
          adminNotes: adminNotes !== undefined ? adminNotes : undefined,
        },
      });

      // Notify the school coordinator
      if (status && status !== existing.status) {
        await tx.notification.create({
          data: {
            userId: existing.booking.createdById,
            title: `Transport Update: #${existing.booking.bookingReference}`,
            message: `Your transportation request status has been updated to "${status}". Quote: ${tr.quoteAmount ? `₹${tr.quoteAmount}` : 'Under estimation'}.`,
            type: 'TRANSPORT',
            link: '/school/bookings',
          },
        });
      }

      return tr;
    });

    await logAudit(
      req.user!.userId,
      'TRAVELLER_REQUEST_UPDATED',
      'TravellerRequest',
      id,
      `Updated traveller request status to ${status || existing.status}, quote: ${quoteAmount || existing.quoteAmount}`
    );

    res.json({
      success: true,
      message: 'Traveller service coordination updated.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// AUDIT LOGS
export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}

// PLATFORM SETTINGS
export async function getPlatformSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePlatformSetting(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { key, value } = req.body;
    if (!key) throw new AppError('Setting key is required', 400);

    const setting = await prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await logAudit(req.user!.userId, 'PLATFORM_SETTING_UPDATED', 'PlatformSetting', key, `Setting ${key} updated to ${value}`);

    res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminBookingDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        school: true,
        destination: {
          include: {
            images: true,
            operatingHours: true,
          },
        },
        facilities: { include: { facility: true } },
        priceItems: true,
        quoteVersions: { orderBy: { versionNumber: 'desc' } },
        changeRequests: { orderBy: { createdAt: 'desc' } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { changedBy: { select: { name: true, role: true } } },
        },
        travellerRequest: {
          include: { assignedAdmin: { select: { name: true, phone: true } } },
        },
      },
    });

    if (!booking) {
      throw new AppError('Booking record not found.', 404);
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminDestinationDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const [dest, auditLogs] = await Promise.all([
      prisma.destination.findUnique({
        where: { id },
        include: {
          images: true,
          ticketTypes: true,
          facilities: true,
          operatingHours: { orderBy: { dayOfWeek: 'asc' } },
          staff: { include: { user: true } },
          bookings: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              school: { select: { id: true, name: true, city: true } },
            },
          },
          _count: { select: { bookings: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: 'Destination', entityId: id },
            { entityType: 'DESTINATION', entityId: id },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      }),
    ]);

    if (!dest) throw new AppError('Destination not found', 404);
    res.json({ success: true, data: { ...dest, auditLogs } });
  } catch (err) {
    next(err);
  }
}

export async function getAdminSchoolDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const [school, auditLogs] = await Promise.all([
      prisma.school.findUnique({
        where: { id },
        include: {
          staff: { include: { user: true } },
          bookings: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { destination: { select: { id: true, name: true, city: true } } },
          },
          _count: { select: { bookings: true, staff: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: 'School', entityId: id },
            { entityType: 'SCHOOL', entityId: id },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      }),
    ]);

    if (!school) throw new AppError('School not found', 404);
    res.json({ success: true, data: { ...school, auditLogs } });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      throw new AppError('isActive boolean is required', 400);
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw new AppError('User not found', 404);
    if (targetUser.role === 'SUPER_ADMIN') {
      throw new AppError('Cannot suspend super admin account through this API', 403);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    await logAudit(
      req.user!.userId,
      isActive ? 'USER_ACCOUNT_ACTIVATED' : 'USER_ACCOUNT_SUSPENDED',
      'User',
      id,
      `Super Admin ${isActive ? 'activated' : 'suspended'} user ${targetUser.email}`
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
