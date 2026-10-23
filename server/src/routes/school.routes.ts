import { Router } from 'express';
import {
  getMySchool,
  updateMySchool,
  getMyBookings,
  getBookingDetail,
  createBooking,
  respondToChangeRequest,
  cancelBooking,
  onboardSchool,
  getSchoolOnboardingStatus,
} from '../controllers/school.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Onboarding endpoints (any authenticated user can check status or submit onboarding)
router.post('/onboard', onboardSchool);
router.get('/onboarding-status', getSchoolOnboardingStatus);

router.get('/me', requireRole(['SCHOOL_ADMIN', 'SCHOOL_STAFF', 'SUPER_ADMIN']), getMySchool);
router.put('/me', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), updateMySchool);
router.get('/bookings', requireRole(['SCHOOL_ADMIN', 'SCHOOL_STAFF', 'SUPER_ADMIN']), getMyBookings);
router.get('/bookings/:id', requireRole(['SCHOOL_ADMIN', 'SCHOOL_STAFF', 'SUPER_ADMIN']), getBookingDetail);
router.post('/bookings', requireRole(['SCHOOL_ADMIN', 'SCHOOL_STAFF', 'SUPER_ADMIN']), createBooking);
router.post('/bookings/:id/respond-change', requireRole(['SCHOOL_ADMIN', 'SCHOOL_STAFF', 'SUPER_ADMIN']), respondToChangeRequest);
router.post('/bookings/:id/cancel', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), cancelBooking);

export default router;
