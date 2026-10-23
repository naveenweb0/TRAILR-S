import { Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';

export async function getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required', 401);

    // Fetch user's direct notifications, excluding any test/mock entries
    const directNotifications = await prisma.notification.findMany({
      where: {
        userId,
        NOT: [
          { title: { contains: 'SCH-TEST' } },
          { message: { contains: 'SCH-TEST' } },
          { title: { contains: 'TEST-' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let notifications = [...directNotifications];

    // If Super Admin, synthesize real-time operational notifications from live pending entities
    if (req.user?.role === 'SUPER_ADMIN') {
      const [pendingSchools, pendingDestinations, newFleetRequests, recentBookings] = await Promise.all([
        prisma.school.findMany({
          where: { verificationStatus: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.destination.findMany({
          where: { status: 'PENDING_APPROVAL' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.travellerServiceRequest.findMany({
          where: { status: 'NEW' },
          include: { school: true, destination: true, booking: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.booking.findMany({
          where: { status: 'SUBMITTED' },
          include: { school: true, destination: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const liveAdminAlerts = [
        ...pendingSchools.map((s) => ({
          id: `live-school-${s.id}`,
          title: `Institute Pending Verification: ${s.name}`,
          message: `${s.contactPerson} submitted an onboarding application for ${s.city}, ${s.state}. Board: ${s.board || 'CBSE'}.`,
          type: 'INFO',
          isRead: false,
          link: '/admin/schools',
          createdAt: s.createdAt,
        })),
        ...pendingDestinations.map((d) => ({
          id: `live-dest-${d.id}`,
          title: `New Venue Proposal Pending Review: ${d.name}`,
          message: `${d.city}, ${d.state} — Min group size: ${d.minGroupSize}, Max: ${d.maxGroupSize}. Review safety and pricing model.`,
          type: 'INFO',
          isRead: false,
          link: '/admin/destinations',
          createdAt: d.createdAt,
        })),
        ...newFleetRequests.map((r) => ({
          id: `live-fleet-${r.id}`,
          title: `Transport Fleet Assistance: #${r.booking?.bookingReference || r.id.slice(0, 8)}`,
          message: `${r.school?.name} requested ${r.passengerCount} passenger fleet coaches to ${r.destination?.name}.`,
          type: 'WARNING',
          isRead: false,
          link: '/admin/traveller-requests',
          createdAt: r.createdAt,
        })),
        ...recentBookings.map((b) => ({
          id: `live-booking-${b.id}`,
          title: `New Excursion Reservation: #${b.bookingReference}`,
          message: `${b.school?.name} submitted booking for ${b.totalGroupSize} visitors to ${b.destination?.name}.`,
          type: 'SUCCESS',
          isRead: false,
          link: '/admin/bookings',
          createdAt: b.createdAt,
        })),
      ];

      // Merge and sort chronologically
      const existingIds = new Set(notifications.map((n) => n.id));
      for (const alert of liveAdminAlerts) {
        if (!existingIds.has(alert.id)) {
          notifications.push(alert as any);
        }
      }

      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      notifications = notifications.slice(0, 20);
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    } else if (!id.startsWith('live-')) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
}
