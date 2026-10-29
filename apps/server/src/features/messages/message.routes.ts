import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { messageRateLimit } from '../../middleware/rateLimit.middleware';
import { getMyThread, getMyUnreadMessages, postMyMessage, postMyMessagesRead } from './message.controller';

// The trainee's side of her messages with her current coach (the coach's side is under /api/coach).
// Polled / refetched on focus for now — push arrives with Capacitor (Phase 5b).
export const messagesRouter = Router();

messagesRouter.use(requireAuth, requireRole('trainee'));

messagesRouter.get('/', getMyThread);
messagesRouter.get('/unread', getMyUnreadMessages);
messagesRouter.post('/', messageRateLimit, postMyMessage);
messagesRouter.post('/read', postMyMessagesRead);
