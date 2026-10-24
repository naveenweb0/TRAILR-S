import { Router } from 'express';
import {
  login,
  neonLogin,
  firebaseLogin,
  getMe,
  registerSchool,
  forgotPassword,
  resetPassword,
  selectPortal,
  validateSuperAdminInvitation,
  acceptSuperAdminInvitation,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/neon-login', neonLogin);
router.post('/portal-selection', authenticate, selectPortal);
router.post('/firebase-login', firebaseLogin); // Deprecated backwards compatibility
router.post('/register', registerSchool);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);

// Super Admin Invitation acceptance routes
router.get('/super-admin-invitation/validate/:token', validateSuperAdminInvitation);
router.post('/super-admin-invitation/accept', authenticate, acceptSuperAdminInvitation);

export default router;
