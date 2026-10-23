import { Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { AuthRequest, logAudit } from '../middleware/auth.js';
import { BookingStatus, AvailabilityStatus, TravellerStatus, AcPreference, Role, VerificationStatus } from '@prisma/client';
import { generateToken } from '../utils/jwt.js';

export async function getMySchool(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) throw new AppError('School context not found for this account.', 403);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        staff: { include: { user: true } },
      },
    });

    if (!school) throw new AppError('School not found', 404);

    res.json({
      success: true,
      data: school,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMySchool(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) throw new AppError('School context not found', 403);

    const {
      name,
      board,
      schoolType,
      address,
      city,
      state,
      pincode,
      contactPhone,
      contactPerson,
      designation,
      approximateStrength,
      website,
      gstNumber,
    } = req.body;

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name,
        board,
        schoolType,
        address,
        city,
        state,
        pincode,
        contactPhone,
        contactPerson,
        designation,
        approximateStrength: approximateStrength ? parseInt(approximateStrength, 10) : undefined,
        website,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
      },
    });

    await logAudit(req.user?.userId || null, 'SCHOOL_PROFILE_UPDATED', 'School', schoolId, `Updated profile for ${name}`);

    res.json({
      success: true,
      message: 'School profile updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) throw new AppError('School context not found', 403);

    const { status } = req.query;
    const where: any = { schoolId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            category: true,
            city: true,
            state: true,
            coverImage: true,
            contactPhone: true,
          },
        },
        facilities: { include: { facility: true } },
        priceItems: true,
        quoteVersions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        changeRequests: { orderBy: { createdAt: 'desc' } },
        travellerRequest: true,
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

export async function getBookingDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schoolId = req.schoolId;
    const id = req.params.id as string;

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        ...(req.user?.role !== 'SUPER_ADMIN' ? { schoolId } : {}),
      },
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

// CREATE BOOKING (Transaction-safe capacity check, itemized calculation, transport separation)
export async function createBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) throw new AppError('School context not found for this user.', 403);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, verificationStatus: true },
    });
    if (!school || school.verificationStatus !== 'VERIFIED') {
      throw new AppError('Your educational institution account must be verified by an administrator before booking excursions.', 403);
    }

    const {
      destinationId,
      visitDate,
      arrivalTime,
      departureTime,
      studentCount,
      teacherCount,
      staffCount,
      tripPurpose,
      ageGroups,
      specialRequirements,
      dietaryNeeds,
      accessibilityRequirements,
      schoolNotes,
      selectedTicketTypes, // Array of { id, quantity }
      selectedFacilities,  // Array of { id, quantity }
      requiresTransport,   // Boolean
      transportDetails,    // Object with pickupAddress, city, time, vehicle, etc.
    } = req.body;

    if (!destinationId || !visitDate || !studentCount || studentCount <= 0) {
      throw new AppError('Please provide destination, visit date, and student count.', 400);
    }

    const sCount = parseInt(studentCount, 10);
    const tCount = parseInt(teacherCount || 0, 10);
    const staffC = parseInt(staffCount || 0, 10);
    const totalGroupSize = sCount + tCount + staffC;

    const parsedVisitDate = new Date(visitDate);
    parsedVisitDate.setUTCHours(0, 0, 0, 0);

    const destination = await prisma.destination.findUnique({
      where: { id: destinationId },
      include: {
        ticketTypes: true,
        facilities: true,
        operatingHours: true,
      },
    });

    if (!destination || destination.status !== 'PUBLISHED') {
      throw new AppError('Destination is not currently available for booking.', 400);
    }

    if (totalGroupSize < destination.minGroupSize) {
      throw new AppError(`Total group size (${totalGroupSize}) is below minimum requirement (${destination.minGroupSize}) for school excursions.`, 400);
    }

    if (totalGroupSize > destination.maxGroupSize) {
      throw new AppError(`Total group size (${totalGroupSize}) exceeds destination limit (${destination.maxGroupSize}).`, 400);
    }

    // Check operating hours on day of week
    const dayOfWeek = parsedVisitDate.getUTCDay();
    const opHours = destination.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (opHours && !opHours.isOpen) {
      throw new AppError('The destination is closed on this day of the week.', 400);
    }

    // Concurrency-safe capacity reservation in transaction with pessimistic row lock
    const bookingResult = await prisma.$transaction(async (tx) => {
      // Row lock to strictly serialize simultaneous booking attempts on this venue
      await tx.$executeRaw`SELECT id FROM "Destination" WHERE id = ${destinationId} FOR UPDATE;`;

      // 1. Check existing availability record
      const avail = await tx.destinationAvailability.findUnique({
        where: {
          destinationId_date: {
            destinationId,
            date: parsedVisitDate,
          },
        },
      });

      if (avail && (avail.status === AvailabilityStatus.CLOSED || avail.status === AvailabilityStatus.BLACKOUT || avail.status === AvailabilityStatus.FULLY_BOOKED)) {
        throw new AppError(`Selected date is marked as ${avail.status}: ${avail.notes || 'Unavailable for bookings.'}`, 400);
      }

      // Check current bookings sum
      const existingBookings = await tx.booking.findMany({
        where: {
          destinationId,
          visitDate: parsedVisitDate,
          status: { in: [BookingStatus.SUBMITTED, BookingStatus.ACCEPTED, BookingStatus.CONFIRMED] },
        },
        select: { totalGroupSize: true },
      });

      const currentBooked = existingBookings.reduce((sum, b) => sum + b.totalGroupSize, 0);
      const dailyCap = avail ? avail.dailyCapacity : destination.maxGroupSize;

      if (currentBooked + totalGroupSize > dailyCap) {
        throw new AppError(`Destination capacity reached for ${visitDate}. Available remaining capacity is ${Math.max(0, dailyCap - currentBooked)}.`, 400);
      }

      // 2. Calculate accurate line-item pricing
      const dayIsWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      let studentTotal = 0;
      let staffTotal = 0;
      let addOnsTotal = 0;

      const priceItemsData: any[] = [];
      const bookingFacilitiesData: any[] = [];

      // Student tickets
      const primaryStudentTicket = destination.ticketTypes.find((t) => t.category === 'STUDENT') || destination.ticketTypes[0];
      const studentRate = dayIsWeekend && primaryStudentTicket.weekendPrice ? primaryStudentTicket.weekendPrice : (primaryStudentTicket.weekdayPrice || primaryStudentTicket.basePrice);
      studentTotal = sCount * studentRate;

      priceItemsData.push({
        ticketTypeId: primaryStudentTicket.id,
        description: `${primaryStudentTicket.name} (${sCount} students @ ₹${studentRate})`,
        category: 'STUDENT',
        unitPrice: studentRate,
        quantity: sCount,
        totalPrice: studentTotal,
      });

      // Teacher / Staff tickets & complimentary ratio
      const primaryStaffTicket = destination.ticketTypes.find((t) => t.category === 'TEACHER');
      const compRatio = primaryStudentTicket.complimentaryStaffRatio || 15;
      const freeStaffCount = Math.floor(sCount / compRatio);
      const paidStaffCount = Math.max(0, (tCount + staffC) - freeStaffCount);

      if (paidStaffCount > 0 && primaryStaffTicket) {
        const staffRate = dayIsWeekend && primaryStaffTicket.weekendPrice ? primaryStaffTicket.weekendPrice : (primaryStaffTicket.weekdayPrice || primaryStaffTicket.basePrice);
        staffTotal = paidStaffCount * staffRate;

        priceItemsData.push({
          ticketTypeId: primaryStaffTicket.id,
          description: `Accompanying Staff (${tCount + staffC} total, ${freeStaffCount} complimentary, ${paidStaffCount} paid @ ₹${staffRate})`,
          category: 'TEACHER',
          unitPrice: staffRate,
          quantity: paidStaffCount,
          totalPrice: staffTotal,
        });
      } else {
        priceItemsData.push({
          ticketTypeId: primaryStaffTicket?.id || null,
          description: `Accompanying Staff (${tCount + staffC} staff: All complimentary under 1:${compRatio} ratio)`,
          category: 'TEACHER',
          unitPrice: 0,
          quantity: tCount + staffC,
          totalPrice: 0,
        });
      }

      // Selected Facilities / Meals add-ons
      if (Array.isArray(selectedFacilities)) {
        for (const item of selectedFacilities) {
          const fac = destination.facilities.find((f) => f.id === item.id);
          if (fac && fac.extraPrice > 0) {
            const qty = item.quantity || totalGroupSize;
            const cost = qty * fac.extraPrice;
            addOnsTotal += cost;

            bookingFacilitiesData.push({
              facilityId: fac.id,
              quantity: qty,
              unitPrice: fac.extraPrice,
              totalPrice: cost,
            });
          }
        }
      }

      const grandTotal = studentTotal + staffTotal + addOnsTotal;

      // Generate unique human-readable booking reference
      const prefix = 'BK-' + new Date().getFullYear() + '-';
      const count = await tx.booking.count();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const bookingReference = `${prefix}${String(count + 101).padStart(4, '0')}-${randomSuffix}`;

      // 3. Create Booking Record
      const createdBooking = await tx.booking.create({
        data: {
          bookingReference,
          schoolId,
          destinationId,
          createdById: req.user!.userId,
          visitDate: parsedVisitDate,
          arrivalTime: arrivalTime || '10:00',
          departureTime: departureTime || '16:30',
          studentCount: sCount,
          teacherCount: tCount,
          staffCount: staffC,
          totalGroupSize,
          tripPurpose,
          ageGroups,
          specialRequirements,
          dietaryNeeds,
          accessibilityRequirements,
          schoolNotes,
          status: BookingStatus.SUBMITTED,
          requiresTransport: !!requiresTransport,
          originalQuoteAmount: grandTotal,
          priceItems: { create: priceItemsData },
          facilities: { create: bookingFacilitiesData },
          quoteVersions: {
            create: {
              versionNumber: 1,
              studentTotal,
              staffTotal,
              addOnsTotal,
              taxAmount: 0,
              discountAmount: 0,
              grandTotal,
              quoteNotes: `Estimated initial quotation for ${totalGroupSize} participants.`,
              isAccepted: false,
            },
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: BookingStatus.SUBMITTED,
              changedByUserId: req.user!.userId,
              reason: 'New excursion booking submitted by school.',
            },
          },
        },
      });

      // 4. Update or Upsert Availability capacity
      await tx.destinationAvailability.upsert({
        where: {
          destinationId_date: {
            destinationId,
            date: parsedVisitDate,
          },
        },
        update: {
          bookedCount: currentBooked + totalGroupSize,
        },
        create: {
          destinationId,
          date: parsedVisitDate,
          dailyCapacity: destination.maxGroupSize,
          bookedCount: currentBooked + totalGroupSize,
          status: AvailabilityStatus.AVAILABLE,
        },
      });

      // 5. CRITICAL WORKFLOW SEPARATION:
      // If requiresTransport is true -> create linked TravellerServiceRequest in SUPER ADMIN queue.
      // Destination will NOT receive this as a direct arrangement obligation!
      if (requiresTransport && transportDetails) {
        await tx.travellerServiceRequest.create({
          data: {
            bookingId: createdBooking.id,
            schoolId,
            destinationId,
            pickupAddress: transportDetails.pickupAddress || 'School Main Gate',
            pickupCity: transportDetails.pickupCity || destination.city,
            pickupTime: transportDetails.pickupTime || '08:00',
            returnJourney: transportDetails.returnJourney !== false,
            passengerCount: transportDetails.passengerCount ? parseInt(transportDetails.passengerCount, 10) : totalGroupSize,
            preferredVehicle: transportDetails.preferredVehicle || 'School-approved AC Deluxe Coaches',
            numberOfVehicles: transportDetails.numberOfVehicles ? parseInt(transportDetails.numberOfVehicles, 10) : 1,
            acPreference: transportDetails.acPreference || AcPreference.AC,
            accessibilityNeeds: transportDetails.accessibilityNeeds || null,
            specialInstructions: transportDetails.specialInstructions || null,
            status: TravellerStatus.NEW,
          },
        });

        // Notify Super Admins
        const admins = await tx.user.findMany({ where: { role: Role.SUPER_ADMIN } });
        for (const admin of admins) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              title: `New Transport Coordination Request: #${createdBooking.bookingReference}`,
              message: `School requested fleet transportation for ${totalGroupSize} passengers to ${destination.name}.`,
              type: 'TRANSPORT',
              link: '/admin/traveller-requests',
            },
          });
        }
      }

      // Notify Destination Manager about the venue booking
      const destinationStaff = await tx.destinationStaff.findMany({ where: { destinationId } });
      for (const staff of destinationStaff) {
        await tx.notification.create({
          data: {
            userId: staff.userId,
            title: `New School Booking: #${createdBooking.bookingReference}`,
            message: `New visit request for ${totalGroupSize} visitors on ${visitDate}.`,
            type: 'BOOKING',
            link: '/destination/bookings',
          },
        });
      }

      return createdBooking;
    });

    await logAudit(req.user!.userId, 'BOOKING_CREATED', 'Booking', bookingResult.id, `Created booking #${bookingResult.bookingReference} for ${destination.name}`);

    res.status(201).json({
      success: true,
      message: 'Booking request created successfully.',
      data: bookingResult,
    });
  } catch (error) {
    next(error);
  }
}

export async function respondToChangeRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schoolId = req.schoolId;
    const id = req.params.id as string;
    const { changeRequestId, action, schoolResponseNotes } = req.body; // action: 'ACCEPT' | 'REJECT'

    const booking = await prisma.booking.findFirst({
      where: { id, schoolId },
      include: { changeRequests: true },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    const changeRequest = booking.changeRequests.find((c) => c.id === changeRequestId);
    if (!changeRequest || changeRequest.status !== 'PENDING') {
      throw new AppError('Pending change request not found.', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (action === 'ACCEPT') {
        await tx.bookingChangeRequest.update({
          where: { id: changeRequestId },
          data: { status: 'ACCEPTED', resolvedAt: new Date() },
        });

        const newDate = changeRequest.proposedDate || booking.visitDate;
        const newStudentCount = changeRequest.proposedStudentCount || booking.studentCount;
        const newTotal = newStudentCount + booking.teacherCount + booking.staffCount;

        const updatedB = await tx.booking.update({
          where: { id },
          data: {
            visitDate: newDate,
            studentCount: newStudentCount,
            totalGroupSize: newTotal,
            status: BookingStatus.ACCEPTED,
          },
        });

        // Sync calendar availability capacity on date change or group size adjustment
        if (newDate.getTime() !== booking.visitDate.getTime()) {
          await tx.destinationAvailability.updateMany({
            where: { destinationId: booking.destinationId, date: booking.visitDate },
            data: { bookedCount: { decrement: booking.totalGroupSize } },
          });
          await tx.destinationAvailability.upsert({
            where: { destinationId_date: { destinationId: booking.destinationId, date: newDate } },
            update: { bookedCount: { increment: newTotal } },
            create: {
              destinationId: booking.destinationId,
              date: newDate,
              dailyCapacity: 800,
              bookedCount: newTotal,
              status: AvailabilityStatus.AVAILABLE,
            },
          });
        } else if (newTotal !== booking.totalGroupSize) {
          const delta = newTotal - booking.totalGroupSize;
          await tx.destinationAvailability.updateMany({
            where: { destinationId: booking.destinationId, date: booking.visitDate },
            data: { bookedCount: { increment: delta } },
          });
        }

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: id,
            fromStatus: BookingStatus.CHANGES_REQUESTED,
            toStatus: BookingStatus.ACCEPTED,
            changedByUserId: req.user!.userId,
            reason: `School accepted destination changes: ${schoolResponseNotes || 'Confirmed new terms.'}`,
          },
        });

        return updatedB;
      } else {
        await tx.bookingChangeRequest.update({
          where: { id: changeRequestId },
          data: { status: 'REJECTED', resolvedAt: new Date() },
        });

        const updatedB = await tx.booking.update({
          where: { id },
          data: { status: BookingStatus.UNDER_REVIEW },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: id,
            fromStatus: BookingStatus.CHANGES_REQUESTED,
            toStatus: BookingStatus.UNDER_REVIEW,
            changedByUserId: req.user!.userId,
            reason: `School declined proposed changes: ${schoolResponseNotes || 'Requested destination re-evaluation.'}`,
          },
        });

        return updatedB;
      }
    });

    await logAudit(req.user!.userId, 'CHANGE_REQUEST_RESPONDED', 'Booking', id, `School responded to change request: ${action}`);

    res.json({
      success: true,
      message: `Change request ${action === 'ACCEPT' ? 'accepted' : 'declined'}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schoolId = req.schoolId;
    const id = req.params.id as string;
    const { reason } = req.body;

    const booking = await prisma.booking.findFirst({
      where: { id, schoolId },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new AppError(`Cannot cancel a booking that is ${booking.status}.`, 400);
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          rejectionReason: reason || 'Cancelled by school coordinator.',
        },
      });

      // Release booked capacity on availability record
      const avail = await tx.destinationAvailability.findUnique({
        where: {
          destinationId_date: {
            destinationId: booking.destinationId,
            date: booking.visitDate,
          },
        },
      });

      if (avail) {
        await tx.destinationAvailability.update({
          where: { id: avail.id },
          data: {
            bookedCount: Math.max(0, avail.bookedCount - booking.totalGroupSize),
          },
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          changedByUserId: req.user!.userId,
          reason: reason || 'School initiated cancellation.',
        },
      });

      return b;
    });

    await logAudit(req.user!.userId, 'BOOKING_CANCELLED', 'Booking', id, `Booking cancelled by school: ${reason}`);

    res.json({
      success: true,
      message: 'Booking cancelled and capacity released.',
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * First-Time School Onboarding
 * Securely registers school and links authenticated user as School Admin in PENDING status
 */
export async function onboardSchool(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('Authentication required to onboard a school.', 401);
    }

    // 1. Idempotency Check: User already linked to a school profile
    const existingStaff = await prisma.schoolStaff.findFirst({
      where: { userId: req.user.userId },
      include: { school: true },
    });

    if (existingStaff) {
      return res.status(200).json({
        success: true,
        message: 'Account is already associated with an existing school profile.',
        data: {
          school: existingStaff.school,
          isExisting: true,
        },
      });
    }

    const {
      name,
      officialEmail,
      contactPhone,
      contactPerson,
      board,
      schoolType,
      address,
      city,
      state,
      pincode,
      designation,
      approximateStrength,
      website,
      gstNumber,
      affiliationNumber,
      yearEstablished,
      emergencyPhone,
      campusArea,
    } = req.body;

    // 2. Strict Input Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError('School name is required (minimum 2 characters).', 400);
    }
    if (!officialEmail || typeof officialEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(officialEmail.trim())) {
      throw new AppError('A valid official school email address is required.', 400);
    }
    if (!website || typeof website !== 'string' || website.trim().length < 4) {
      throw new AppError('Official Institute website URL is mandatory.', 400);
    }
    if (!gstNumber || typeof gstNumber !== 'string' || gstNumber.trim().length < 5) {
      throw new AppError('Institute GSTIN / GST Number is mandatory.', 400);
    }
    if (!contactPhone || typeof contactPhone !== 'string' || contactPhone.trim().length < 7) {
      throw new AppError('A valid contact phone number is required.', 400);
    }
    if (!contactPerson || typeof contactPerson !== 'string' || contactPerson.trim().length < 2) {
      throw new AppError('Contact person name is required.', 400);
    }
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      throw new AppError('Full physical address is required.', 400);
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

    // 3. Duplicate School Email Guard
    const normalizedOfficialEmail = officialEmail.toLowerCase().trim();
    const existingSchoolWithEmail = await prisma.school.findUnique({
      where: { officialEmail: normalizedOfficialEmail },
    });

    if (existingSchoolWithEmail) {
      throw new AppError(
        'A school with this official email is already registered. If you are an authorized staff member, please ask your school administrator to invite your account.',
        409
      );
    }

    // 4. Transactional School and Staff Creation
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: name.trim(),
          board: board?.trim() || null,
          schoolType: schoolType?.trim() || null,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          officialEmail: normalizedOfficialEmail,
          contactPhone: contactPhone.trim(),
          contactPerson: contactPerson.trim(),
          designation: designation?.trim() || 'School Administrator',
          approximateStrength: approximateStrength ? parseInt(String(approximateStrength), 10) : null,
          website: website?.trim() || null,
          gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
          verificationStatus: VerificationStatus.PENDING, // Strictly PENDING until Super Admin review
          verificationNotes: JSON.stringify({
            affiliationNumber: affiliationNumber?.trim() || null,
            yearEstablished: yearEstablished ? parseInt(String(yearEstablished), 10) : null,
            emergencyPhone: emergencyPhone?.trim() || null,
            campusArea: campusArea?.trim() || null,
          }),
        },
      });

      const staff = await tx.schoolStaff.create({
        data: {
          schoolId: school.id,
          userId: req.user!.userId,
          role: 'ADMIN',
          designation: designation?.trim() || 'School Administrator',
        },
      });

      // Update user's role to SCHOOL_ADMIN
      const updatedUser = await tx.user.update({
        where: { id: req.user!.userId },
        data: {
          role: Role.SCHOOL_ADMIN,
          portalType: 'SCHOOL',
          phone: contactPhone.trim(),
        },
      });

      return { school, staff, user: updatedUser };
    });

    // 5. Generate refreshed JWT payload with schoolId
    const updatedToken = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      schoolId: result.school.id,
    });

    // 6. Audit Trail
    await logAudit(
      req.user.userId,
      'SCHOOL_ONBOARDING_SUBMITTED',
      'School',
      result.school.id,
      `School "${result.school.name}" onboarded by ${req.user.email}. Verification status: PENDING.`
    );

    res.status(201).json({
      success: true,
      message: 'School registration submitted successfully. It is currently pending verification by platform administration.',
      data: {
        school: result.school,
        token: updatedToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          school: result.school,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get School Onboarding Status for Authenticated User
 */
export async function getSchoolOnboardingStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('Authentication required.', 401);
    }

    const staff = await prisma.schoolStaff.findFirst({
      where: { userId: req.user.userId },
      include: { school: true },
    });

    if (!staff) {
      return res.json({
        success: true,
        data: {
          isOnboarded: false,
          status: 'NOT_STARTED',
          school: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        isOnboarded: true,
        status: staff.school.verificationStatus,
        role: staff.role,
        school: staff.school,
      },
    });
  } catch (error) {
    next(error);
  }
}
