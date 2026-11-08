import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CoachingNotFoundError, endCoachingByTrainee, listMyCoachings, readTraineeCoachingParam } from './coaching.service';
import { sendError } from '../../i18n';
import { listMyCommunities } from '../communities/community.service';

// The trainee's own relationships: her live coachings (the coaching-aware hooks) and her communities.
export const coachingsRouter = Router();
export const communitiesRouter = Router();
/** /api/me — actions a trainee takes on her own account's relationships. */
export const meRouter = Router();

coachingsRouter.use(requireAuth, requireRole('trainee'));
coachingsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ coachings: await listMyCoachings(req.userId!) });
});

communitiesRouter.use(requireAuth);
/** Names only — a community never exposes other members' private data. */
communitiesRouter.get('/mine', async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ communities: await listMyCommunities(req.userId!) });
});

meRouter.use(requireAuth, requireRole('trainee'));
/** She ends her own coaching (`?coachingId=` = one of hers; default her current one) → 200 { endedAt }. */
meRouter.patch('/coaching/end', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coachingId = await readTraineeCoachingParam(req.userId!, req.query.coachingId);
    const endedAt = await endCoachingByTrainee(req.userId!, coachingId);
    res.status(200).json({ endedAt: endedAt.toISOString() });
  } catch (error) {
    if (error instanceof CoachingNotFoundError) return sendError(res, 404, error.serverMessage);
    throw error;
  }
});
