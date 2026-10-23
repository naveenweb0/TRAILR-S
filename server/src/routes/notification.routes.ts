import { Router } from 'express';
import { getMyNotifications, markAsRead } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);

export default router;
