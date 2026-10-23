import { Router } from 'express';
import { login, neonLogin, firebaseLogin, getMe, registerSchool, forgotPassword, resetPassword, selectPortal } from '../controllers/auth.controller.js';
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

export default router;
