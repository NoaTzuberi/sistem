import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { optionalAuth } from '../../middleware/optionalAuth.middleware';
import { joinRateLimit } from '../../middleware/rateLimit.middleware';
import { getJoinPreview, postJoin } from './invite.controller';

// /api/join/:code — the preview works signed out (the sign-up screen shows the coach's name);
// accepting needs a signed-in trainee (redeemInvite checks the role in the database).
export const joinRouter = Router();

joinRouter.use(joinRateLimit);
joinRouter.get('/:code', optionalAuth, getJoinPreview);
joinRouter.post('/:code', requireAuth, postJoin);
