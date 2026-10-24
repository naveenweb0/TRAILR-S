import { Router } from 'express';
import {
  getAdminOverview,
  listAllDestinations,
  getAdminDestinationDetail,
  onboardDestination,
  updateDestinationStatus,
  processDestinationProposal,
  updateAdminDestinationAvailability,
  listAllSchools,
  getAdminSchoolDetail,
  updateSchoolVerification,
  listAllBookings,
  getAdminBookingDetail,
  listTravellerRequests,
  updateTravellerRequest,
  updateUserStatus,
  getAuditLogs,
  getPlatformSettings,
  updatePlatformSetting,
  listSuperAdminsAndInvitations,
  inviteSuperAdmin,
  cancelSuperAdminInvitation,
  revokeSuperAdminAccess,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(['SUPER_ADMIN']));

router.get('/overview', getAdminOverview);

// Super Admin Management
router.get('/super-admins', listSuperAdminsAndInvitations);
router.post('/super-admins/invite', inviteSuperAdmin);
router.post('/super-admins/invitations/:id/cancel', cancelSuperAdminInvitation);
router.post('/super-admins/revoke/:id', revokeSuperAdminAccess);

// Destination management
router.get('/destinations', listAllDestinations);
router.get('/destinations/:id', getAdminDestinationDetail);
router.post('/destinations/onboard', onboardDestination);
router.put('/destinations/:id/status', updateDestinationStatus);
router.post('/destinations/:id/availability', updateAdminDestinationAvailability);
router.put('/destinations/:id/availability', updateAdminDestinationAvailability);
router.post('/destinations/:id/proposal-decision', processDestinationProposal);
router.put('/destinations/:id/proposal-decision', processDestinationProposal);

// School management
router.get('/schools', listAllSchools);
router.get('/schools/:id', getAdminSchoolDetail);
router.put('/schools/:id/verification', updateSchoolVerification);

// User administration
router.put('/users/:id/status', updateUserStatus);

// Global bookings
router.get('/bookings', listAllBookings);
router.get('/bookings/:id', getAdminBookingDetail);

// Dedicated Traveller-Service Requests Queue
router.get('/traveller-requests', listTravellerRequests);
router.put('/traveller-requests/:id', updateTravellerRequest);

// System Audit Logs & Settings
router.get('/audit-logs', getAuditLogs);
router.get('/settings', getPlatformSettings);
router.put('/settings', updatePlatformSetting);

export default router;
