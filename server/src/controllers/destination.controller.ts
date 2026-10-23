import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { AuthRequest, logAudit } from '../middleware/auth.js';
import { AvailabilityStatus, BookingStatus, DestinationStatus, Role, TicketCategory } from '@prisma/client';
import { generateToken } from '../utils/jwt.js';

export async function listDestinations(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, city, state, sort } = req.query;

    const where: any = {
      status: DestinationStatus.PUBLISHED,
      isVerified: true,
    };

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (city && typeof city === 'string' && city !== 'ALL') {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (state && typeof state === 'string' && state !== 'ALL') {
      where.state = { equals: state, mode: 'insensitive' };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'name_asc') orderBy = { name: 'asc' };
    if (sort === 'min_group') orderBy = { minGroupSize: 'asc' };

    const destinations = await prisma.destination.findMany({
      where,
      orderBy,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        ticketTypes: { where: { isActive: true }, orderBy: { basePrice: 'asc' } },
        facilities: true,
      },
    });

    const formatted = destinations.map((dest) => {
      const studentTicket = dest.ticketTypes.find((t) => t.category === 'STUDENT') || dest.ticketTypes[0];
      return {
        ...dest,
        startingPrice: studentTicket ? studentTicket.basePrice : 0,
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDestinationBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug as string;
    const destination = await prisma.destination.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        status: DestinationStatus.PUBLISHED,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        facilities: { orderBy: { isIncluded: 'desc' } },
        ticketTypes: { where: { isActive: true }, orderBy: { basePrice: 'asc' } },
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    if (!destination) {
      throw new AppError('Destination not found or not published.', 404);
    }

    res.json({
      success: true,
      data: destination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDestinationAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { year, month } = req.query;

    const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string, 10) - 1 : new Date().getMonth();

    const startDate = new Date(Date.UTC(targetYear, targetMonth, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59));

    const destination = await prisma.destination.findUnique({
      where: { id },
      include: { operatingHours: true },
    });

    if (!destination) {
      throw new AppError('Destination not found', 404);
    }

    // Fetch existing records in this range
    const records = await prisma.destinationAvailability.findMany({
      where: {
        destinationId: id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Also calculate any booked capacity from accepted or submitted bookings
    const bookings = await prisma.booking.findMany({
      where: {
        destinationId: id,
        visitDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: [BookingStatus.SUBMITTED, BookingStatus.ACCEPTED, BookingStatus.CONFIRMED, BookingStatus.CHANGES_REQUESTED],
        },
      },
      select: {
        visitDate: true,
        totalGroupSize: true,
      },
    });

    // Create a map of date string -> booked count
    const bookedMap = new Map<string, number>();
    for (const b of bookings) {
      const key = b.visitDate.toISOString().split('T')[0];
      bookedMap.set(key, (bookedMap.get(key) || 0) + b.totalGroupSize);
    }

    // Format day by day
    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const calendarDays = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(Date.UTC(targetYear, targetMonth, day));
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getUTCDay();

      const existingRecord = records.find((r) => r.date.toISOString().split('T')[0] === dateKey);
      const operatingHour = destination.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

      const isPast = currentDate.getTime() < now.getTime();
      const bookedGroupSize = bookedMap.get(dateKey) || (existingRecord ? existingRecord.bookedCount : 0);
      const capacity = existingRecord ? existingRecord.dailyCapacity : destination.maxGroupSize;
      const remainingCapacity = Math.max(0, capacity - bookedGroupSize);

      let status = existingRecord ? existingRecord.status : AvailabilityStatus.AVAILABLE;
      let notes = existingRecord?.notes || 'Available for school groups';

      if (isPast) {
        status = AvailabilityStatus.CLOSED;
        notes = 'Past date';
      } else if (operatingHour && !operatingHour.isOpen) {
        status = AvailabilityStatus.CLOSED;
        notes = 'Weekly closure';
      } else if (remainingCapacity <= 0) {
        status = AvailabilityStatus.FULLY_BOOKED;
        notes = 'Fully booked';
      } else if (remainingCapacity < destination.minGroupSize * 2) {
        status = AvailabilityStatus.LIMITED;
        notes = `Limited capacity: ${remainingCapacity} remaining`;
      }

      calendarDays.push({
        date: dateKey,
        day,
        dayOfWeek,
        status,
        capacity,
        bookedCount: bookedGroupSize,
        remainingCapacity,
        notes,
        isPast,
      });
    }

    res.json({
      success: true,
      data: {
        destinationId: id,
        year: targetYear,
        month: targetMonth + 1,
        minGroupSize: destination.minGroupSize,
        maxGroupSize: destination.maxGroupSize,
        bookingLeadDays: destination.bookingLeadDays,
        days: calendarDays,
      },
    });
  } catch (error) {
    next(error);
  }
}

// DESTINATION MANAGER ENDPOINTS
export async function getMyDestinationProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    if (!destinationId) {
      throw new AppError('Destination context not found for this user.', 403);
    }

    const destination = await prisma.destination.findUnique({
      where: { id: destinationId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        facilities: true,
        ticketTypes: true,
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        staff: { include: { user: true } },
      },
    });

    if (!destination) {
      throw new AppError('Destination not found', 404);
    }

    res.json({
      success: true,
      data: destination,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMyDestinationProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    if (!destinationId) {
      throw new AppError('Destination context not found.', 403);
    }

    const {
      name,
      description,
      address,
      city,
      state,
      pincode,
      officialEmail,
      contactPhone,
      managerName,
      website,
      bookingLeadDays,
      minGroupSize,
      maxGroupSize,
      openingTime,
      closingTime,
      safetyInfo,
      accessibilityInfo,
      schoolPolicies,
      cancellationPolicy,
      refundPolicy,
      coverImage,
      logo,
    } = req.body;

    const updated = await prisma.destination.update({
      where: { id: destinationId },
      data: {
        name,
        description,
        address,
        city,
        state,
        pincode,
        officialEmail,
        contactPhone,
        managerName,
        googleProfile: req.body.googleProfile !== undefined ? req.body.googleProfile : undefined,
        website,
        guideAvailable: req.body.guideAvailable !== undefined ? Boolean(req.body.guideAvailable) : undefined,
        bookingLeadDays: bookingLeadDays ? parseInt(bookingLeadDays, 10) : undefined,
        minGroupSize: minGroupSize ? parseInt(minGroupSize, 10) : undefined,
        maxGroupSize: maxGroupSize ? parseInt(maxGroupSize, 10) : undefined,
        openingTime,
        closingTime,
        safetyInfo,
        accessibilityInfo,
        schoolPolicies,
        cancellationPolicy,
        refundPolicy,
        coverImage,
        logo,
      },
    });

    await logAudit(req.user?.userId || null, 'DESTINATION_PROFILE_UPDATED', 'Destination', destinationId, `Updated destination profile for ${name}`);

    res.json({
      success: true,
      message: 'Destination profile updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDateAvailability(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId || req.body.destinationId;
    if (!destinationId) throw new AppError('Destination context not found', 403);

    const { date, status, dailyCapacity, notes } = req.body;
    if (!date) throw new AppError('Date is required', 400);

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
        dailyCapacity: dailyCapacity ? parseInt(dailyCapacity, 10) : undefined,
        notes,
      },
      create: {
        destinationId,
        date: targetDate,
        status: (status as AvailabilityStatus) || AvailabilityStatus.AVAILABLE,
        dailyCapacity: dailyCapacity ? parseInt(dailyCapacity, 10) : 800,
        notes,
      },
    });

    await logAudit(req.user?.userId || null, 'CALENDAR_AVAILABILITY_UPDATED', 'DestinationAvailability', record.id, `Date ${date} marked as ${status}`);

    res.json({
      success: true,
      message: 'Availability updated successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

// DESTINATION INCOMING BOOKINGS (Strictly venue-only, no traveller request burdens!)
export async function getIncomingBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    if (!destinationId) throw new AppError('Destination context not found', 403);

    const { status } = req.query;
    const where: any = { destinationId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            board: true,
            contactPhone: true,
            contactPerson: true,
          },
        },
        facilities: { include: { facility: true } },
        priceItems: true,
        quoteVersions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        changeRequests: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Notice: destination receives only the booking details, NOT traveller coordination queue/status!
    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    const id = req.params.id as string;
    const { destinationNotes } = req.body;

    const booking = await prisma.booking.findFirst({
      where: { id, destinationId },
      include: { school: true, createdBy: true },
    });

    if (!booking) {
      throw new AppError('Booking request not found.', 404);
    }

    if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.REJECTED) {
      throw new AppError(`Cannot accept a booking that is currently ${booking.status}.`, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.ACCEPTED,
          confirmedQuoteAmount: booking.originalQuoteAmount,
          destinationNotes: destinationNotes || booking.destinationNotes,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.ACCEPTED,
          changedByUserId: req.user!.userId,
          reason: destinationNotes || 'Destination accepted the school booking.',
        },
      });

      // Notify the school
      await tx.notification.create({
        data: {
          userId: booking.createdById,
          title: `Booking Accepted: #${booking.bookingReference}`,
          message: `Your school visit booking for ${booking.visitDate.toISOString().split('T')[0]} has been accepted by the destination!`,
          type: 'BOOKING',
          link: '/school/bookings',
        },
      });

      return b;
    });

    await logAudit(req.user!.userId, 'BOOKING_ACCEPTED', 'Booking', id, `Destination accepted booking #${booking.bookingReference}`);

    res.json({
      success: true,
      message: 'Booking request accepted.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    const id = req.params.id as string;
    const { reason } = req.body;

    if (!reason) {
      throw new AppError('A clear rejection reason is mandatory.', 400);
    }

    const booking = await prisma.booking.findFirst({
      where: { id, destinationId },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.REJECTED,
          rejectionReason: reason,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.REJECTED,
          changedByUserId: req.user!.userId,
          reason,
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.createdById,
          title: `Booking Request Declined: #${booking.bookingReference}`,
          message: `Reason: ${reason}`,
          type: 'BOOKING',
          link: '/school/bookings',
        },
      });

      return b;
    });

    await logAudit(req.user!.userId, 'BOOKING_REJECTED', 'Booking', id, `Booking rejected: ${reason}`);

    res.json({
      success: true,
      message: 'Booking request rejected with recorded reason.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestChanges(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    const id = req.params.id as string;
    const { proposedDate, proposedStudentCount, proposedTeacherCount, reason } = req.body;

    if (!reason) {
      throw new AppError('Please provide a reason or clarification for the change request.', 400);
    }

    const booking = await prisma.booking.findFirst({
      where: { id, destinationId },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    const result = await prisma.$transaction(async (tx) => {
      const changeReq = await tx.bookingChangeRequest.create({
        data: {
          bookingId: id,
          requestedByRole: 'DESTINATION',
          proposedDate: proposedDate ? new Date(proposedDate) : null,
          proposedStudentCount: proposedStudentCount ? parseInt(proposedStudentCount, 10) : null,
          proposedTeacherCount: proposedTeacherCount ? parseInt(proposedTeacherCount, 10) : null,
          reason,
          status: 'PENDING',
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CHANGES_REQUESTED },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.CHANGES_REQUESTED,
          changedByUserId: req.user!.userId,
          reason: `Destination requested adjustments: ${reason}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.createdById,
          title: `Action Required: Changes Requested for #${booking.bookingReference}`,
          message: `The destination proposed changes: "${reason}". Please review and confirm.`,
          type: 'BOOKING',
          link: '/school/bookings',
        },
      });

      return { changeReq, updatedBooking };
    });

    await logAudit(req.user!.userId, 'BOOKING_CHANGES_REQUESTED', 'Booking', id, `Changes proposed: ${reason}`);

    res.json({
      success: true,
      message: 'Change request submitted to school.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDestinationReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    if (!destinationId) throw new AppError('Destination context not found', 403);

    const bookings = await prisma.booking.findMany({
      where: { destinationId },
      include: { school: true },
    });

    const totalBookings = bookings.length;
    const acceptedCount = bookings.filter((b) => b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.CONFIRMED).length;
    const pendingCount = bookings.filter((b) => b.status === BookingStatus.SUBMITTED || b.status === BookingStatus.CHANGES_REQUESTED).length;
    const rejectedCount = bookings.filter((b) => b.status === BookingStatus.REJECTED).length;

    let totalVisitors = 0;
    let estimatedRevenue = 0;

    for (const b of bookings) {
      if (b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.CONFIRMED) {
        totalVisitors += b.totalGroupSize;
        estimatedRevenue += b.confirmedQuoteAmount || b.originalQuoteAmount;
      }
    }

    res.json({
      success: true,
      data: {
        totalBookings,
        acceptedCount,
        pendingCount,
        rejectedCount,
        totalVisitors,
        estimatedRevenue,
        recentBookings: bookings.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTicketType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    const id = req.params.id as string;
    const { basePrice, weekdayPrice, weekendPrice, complimentaryStaffRatio, name, description } = req.body;

    const existing = await prisma.ticketType.findFirst({
      where: { id, ...(destinationId ? { destinationId } : {}) },
    });

    if (!existing) throw new AppError('Ticket type not found.', 404);

    const updated = await prisma.ticketType.update({
      where: { id },
      data: {
        basePrice: basePrice !== undefined ? parseFloat(basePrice) : undefined,
        weekdayPrice: weekdayPrice !== undefined ? parseFloat(weekdayPrice) : undefined,
        weekendPrice: weekendPrice !== undefined ? parseFloat(weekendPrice) : undefined,
        complimentaryStaffRatio: complimentaryStaffRatio !== undefined ? parseInt(complimentaryStaffRatio, 10) : undefined,
        name: name || undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    await logAudit(req.user?.userId || null, 'TICKET_PRICE_UPDATED', 'TicketType', id, `Updated price for ${updated.name} to ₹${updated.basePrice}`);

    res.json({
      success: true,
      message: 'Ticket price updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFacility(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const destinationId = req.destinationId;
    const id = req.params.id as string;
    const { name, extraPrice, isIncluded, description } = req.body;

    const existing = await prisma.destinationFacility.findFirst({
      where: { id, ...(destinationId ? { destinationId } : {}) },
    });

    if (!existing) throw new AppError('Facility not found.', 404);

    const updated = await prisma.destinationFacility.update({
      where: { id },
      data: {
        name: name || undefined,
        extraPrice: extraPrice !== undefined ? parseFloat(extraPrice) : undefined,
        isIncluded: isIncluded !== undefined ? !!isIncluded : undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    await logAudit(req.user?.userId || null, 'FACILITY_UPDATED', 'DestinationFacility', id, `Updated facility ${updated.name}`);

    res.json({
      success: true,
      message: 'Facility updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * First-Time Destination Onboarding
 * Securely creates a destination proposal in PENDING_APPROVAL status and links authenticated user as Destination Manager
 */
export async function onboardDestination(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('Authentication required to onboard a destination.', 401);
    }

    // 1. Idempotency Check: Already linked to an existing destination proposal/record
    const existingStaff = await prisma.destinationStaff.findFirst({
      where: { userId: req.user.userId },
      include: {
        destination: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            ticketTypes: true,
          },
        },
      },
    });

    if (existingStaff) {
      return res.status(200).json({
        success: true,
        message: 'Account is already associated with an existing destination proposal.',
        data: {
          destination: existingStaff.destination,
          isExisting: true,
        },
      });
    }

    const {
      name,
      category,
      businessName,
      officialEmail,
      contactPhone,
      managerName,
      googleProfile,
      website,
      description,
      address,
      city,
      state,
      pincode,
      openingTime,
      closingTime,
      weeklyOperatingDays,
      minGroupSize,
      maxGroupSize,
      guideAvailable,
      guideNeeded,
      bookingLeadDays,
      studentTicketPrice,
      teacherTicketPrice,
      complimentaryStaffRatio,
      safetyInfo,
      accessibilityInfo,
      schoolPolicies,
      facilities,
      images,
    } = req.body;

    // 2. Strict Input Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError('Destination name is required (minimum 2 characters).', 400);
    }
    if (!category || typeof category !== 'string' || category.trim().length < 2) {
      throw new AppError('Destination category is required.', 400);
    }
    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      throw new AppError('Legal business name is required.', 400);
    }
    if (!officialEmail || typeof officialEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(officialEmail.trim())) {
      throw new AppError('A valid official business email address is required.', 400);
    }
    if (!googleProfile || typeof googleProfile !== 'string' || googleProfile.trim().length < 5) {
      throw new AppError('Google Business Profile / Maps link is mandatory for venue verification.', 400);
    }
    if (!contactPhone || typeof contactPhone !== 'string' || contactPhone.trim().length < 7) {
      throw new AppError('A valid contact phone number is required.', 400);
    }
    if (!managerName || typeof managerName !== 'string' || managerName.trim().length < 2) {
      throw new AppError('Manager name is required.', 400);
    }
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      throw new AppError('Description is required (minimum 10 characters).', 400);
    }
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      throw new AppError('Full venue address is required.', 400);
    }
    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      throw new AppError('City is required.', 400);
    }
    if (!state || typeof state !== 'string' || state.trim().length < 2) {
      throw new AppError('State is required.', 400);
    }
    if (!pincode || typeof pincode !== 'string' || pincode.trim().length < 4) {
      throw new AppError('PIN code is required.', 400);
    }

    const parsedStudentPrice = parseFloat(studentTicketPrice);
    if (isNaN(parsedStudentPrice) || parsedStudentPrice <= 0) {
      throw new AppError('A valid student ticket price greater than 0 is required.', 400);
    }

    const parsedTeacherPrice = parseFloat(teacherTicketPrice) || 0;
    const parsedMinGroup = parseInt(minGroupSize, 10) || 20;
    const parsedMaxGroup = parseInt(maxGroupSize, 10) || 1500;
    const parsedLeadDays = parseInt(bookingLeadDays, 10) || 2;
    const parsedRatio = parseInt(complimentaryStaffRatio, 10) || 15;

    // 3. Duplicate Official Email Guard
    const normalizedEmail = officialEmail.toLowerCase().trim();
    const existingDest = await prisma.destination.findUnique({
      where: { officialEmail: normalizedEmail },
    });
    if (existingDest) {
      throw new AppError('A destination with this official email is already registered.', 409);
    }

    // 4. Generate unique slug
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = 'destination';
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.destination.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Determine cover image URL if images array provided
    let coverImageUrl: string | null = null;
    if (Array.isArray(images) && images.length > 0) {
      const coverItem = images.find((img: any) => img.isCover === true);
      coverImageUrl = coverItem ? coverItem.url : images[0].url;
    }

    // 5. Transactional Proposal Creation
    const result = await prisma.$transaction(async (tx) => {
      const destination = await tx.destination.create({
        data: {
          name: name.trim(),
          category: category.trim(),
          businessName: businessName.trim(),
          slug,
          description: description.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          officialEmail: normalizedEmail,
          contactPhone: contactPhone.trim(),
          managerName: managerName.trim(),
          googleProfile: googleProfile.trim(),
          website: website?.trim() || null,
          guideAvailable: guideAvailable === true || guideAvailable === 'true' || guideNeeded === true || guideNeeded === 'true' || guideNeeded === 'yes',
          openingTime: openingTime?.trim() || '09:30',
          closingTime: closingTime?.trim() || '18:00',
          weeklyOperatingDays: weeklyOperatingDays?.trim() || 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
          minGroupSize: parsedMinGroup,
          maxGroupSize: parsedMaxGroup,
          bookingLeadDays: parsedLeadDays,
          safetyInfo: safetyInfo?.trim() || null,
          schoolPolicies: schoolPolicies?.trim() || null,
          coverImage: coverImageUrl,
          status: DestinationStatus.PENDING_APPROVAL, // Strictly PENDING_APPROVAL until Super Admin review
          isVerified: false,
        },
      });

      // Staff association
      const staff = await tx.destinationStaff.create({
        data: {
          destinationId: destination.id,
          userId: req.user!.userId,
          role: 'MANAGER',
        },
      });

      // Default Student Ticket Type
      await tx.ticketType.create({
        data: {
          destinationId: destination.id,
          name: 'Ticket per Student',
          category: TicketCategory.STUDENT,
          basePrice: parsedStudentPrice,
          minQuantity: parsedMinGroup,
          maxQuantity: parsedMaxGroup,
          complimentaryStaffRatio: parsedRatio,
          isActive: true,
        },
      });

      // Default Teacher / Adult Ticket Type
      await tx.ticketType.create({
        data: {
          destinationId: destination.id,
          name: 'Ticket per Teacher',
          category: TicketCategory.TEACHER,
          basePrice: parsedTeacherPrice,
          minQuantity: 1,
          maxQuantity: 100,
          isActive: true,
        },
      });

      // Facilities if provided
      if (Array.isArray(facilities) && facilities.length > 0) {
        for (const fac of facilities) {
          if (fac && fac.name) {
            await tx.destinationFacility.create({
              data: {
                destinationId: destination.id,
                name: String(fac.name).trim(),
                category: fac.category || 'GENERAL',
                isIncluded: Boolean(fac.isIncluded),
                extraPrice: parseFloat(fac.extraPrice) || 0,
                description: fac.description || null,
              },
            });
          }
        }
      }

      // Images if provided (from Cloudinary uploader)
      if (Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img && img.url) {
            await tx.destinationImage.create({
              data: {
                destinationId: destination.id,
                url: img.url,
                publicId: img.publicId || null,
                caption: img.caption || '',
                isCover: Boolean(img.isCover || (i === 0 && !coverImageUrl)),
                sortOrder: img.sortOrder !== undefined ? parseInt(img.sortOrder, 10) : i,
              },
            });
          }
        }
      }

      // Update user's role to DESTINATION_MANAGER
      const updatedUser = await tx.user.update({
        where: { id: req.user!.userId },
        data: {
          role: Role.DESTINATION_MANAGER,
          portalType: 'DESTINATION',
          phone: contactPhone.trim(),
        },
      });

      return { destination, staff, user: updatedUser };
    });

    // 6. Generate refreshed JWT payload
    const updatedToken = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      destinationId: result.destination.id,
    });

    // 7. Audit Trail
    await logAudit(
      req.user.userId,
      'DESTINATION_PROPOSAL_SUBMITTED',
      'Destination',
      result.destination.id,
      `Destination proposal "${result.destination.name}" submitted by ${req.user.email}. Status: PENDING_APPROVAL.`
    );

    res.status(201).json({
      success: true,
      message: 'Destination proposal submitted successfully. It is currently awaiting review and approval by platform administration.',
      data: {
        destination: result.destination,
        token: updatedToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          destination: result.destination,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Destination Onboarding Status for Authenticated User
 */
export async function getDestinationOnboardingStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('Authentication required.', 401);
    }

    const staff = await prisma.destinationStaff.findFirst({
      where: { userId: req.user.userId },
      include: {
        destination: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            ticketTypes: true,
            facilities: true,
          },
        },
      },
    });

    if (!staff) {
      return res.json({
        success: true,
        data: {
          isOnboarded: false,
          status: 'NOT_STARTED',
          destination: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        isOnboarded: true,
        status: staff.destination.status,
        isVerified: staff.destination.isVerified,
        role: staff.role,
        destination: staff.destination,
      },
    });
  } catch (error) {
    next(error);
  }
}
