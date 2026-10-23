import { Router } from 'express';
import {
  listDestinations,
  getDestinationBySlug,
  getDestinationAvailability,
  getMyDestinationProfile,
  updateMyDestinationProfile,
  updateDateAvailability,
  getIncomingBookings,
  acceptBooking,
  rejectBooking,
  requestChanges,
  getDestinationReports,
  updateTicketType,
  updateFacility,
  onboardDestination,
  getDestinationOnboardingStatus,
} from '../controllers/destination.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', listDestinations);
router.get('/detail/:slug', getDestinationBySlug);
router.get('/:id/availability', getDestinationAvailability);

// Onboarding routes (any authenticated user can onboard or check status)
router.post('/onboard', authenticate, onboardDestination);
router.get('/me/onboarding-status', authenticate, getDestinationOnboardingStatus);

// Destination Management Portal routes
router.get('/me/profile', authenticate, requireRole(['DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SUPER_ADMIN']), getMyDestinationProfile);
router.put('/me/profile', authenticate, requireRole(['DESTINATION_MANAGER', 'SUPER_ADMIN']), updateMyDestinationProfile);
router.put('/me/ticket-types/:id', authenticate, requireRole(['DESTINATION_MANAGER', 'SUPER_ADMIN']), updateTicketType);
router.put('/me/facilities/:id', authenticate, requireRole(['DESTINATION_MANAGER', 'SUPER_ADMIN']), updateFacility);
router.post('/me/availability', authenticate, requireRole(['DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SUPER_ADMIN']), updateDateAvailability);
router.get('/me/bookings', authenticate, requireRole(['DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SUPER_ADMIN']), getIncomingBookings);
router.post('/me/bookings/:id/accept', authenticate, requireRole(['DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SUPER_ADMIN']), acceptBooking);
router.post('/me/bookings/:id/reject', authenticate, requireRole(['DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SUPER_ADMIN']), rejectBooking);
router.post('/me/bookings/:id/request-changes', authenticate, requireRole(['DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SUPER_ADMIN']), requestChanges);
router.get('/me/reports', authenticate, requireRole(['DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SUPER_ADMIN']), getDestinationReports);

export default router;
