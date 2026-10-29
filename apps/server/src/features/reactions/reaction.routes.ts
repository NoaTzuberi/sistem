import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getMyReactions, postMyReactionsSeen } from './reaction.controller';

// The trainee's side of her coach's reactions (the coach sets them under /api/coach/trainees/:id/reactions).
export const reactionsRouter = Router();

reactionsRouter.use(requireAuth, requireRole('trainee'));

reactionsRouter.get('/', getMyReactions);
reactionsRouter.post('/seen', postMyReactionsSeen);
