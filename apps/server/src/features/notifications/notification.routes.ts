import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
  getMyNotifications,
  getMyUnreadCount,
  markMyNotificationRead,
  markAllMyNotificationsRead,
  thankMyCoach,
} from './notification.controller';

// Both roles: every call is scoped to the caller's own notifications. They are
// only ever created by the server (notify()) — /thanks too: the server finds the note
// and the coach itself, the client only names which note.
export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', getMyNotifications);
notificationsRouter.get('/unread-count', getMyUnreadCount);
notificationsRouter.post('/read-all', markAllMyNotificationsRead);
notificationsRouter.patch('/:id/read', markMyNotificationRead);
notificationsRouter.post('/thanks', requireRole('trainee'), thankMyCoach);
