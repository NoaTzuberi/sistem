import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { listMyCoachings } from './coaching.service';
import { listMyCommunities } from '../communities/community.service';

// The trainee's own relationships: her live coachings (the coaching-aware hooks) and her communities.
export const coachingsRouter = Router();
export const communitiesRouter = Router();

coachingsRouter.use(requireAuth, requireRole('trainee'));
coachingsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ coachings: await listMyCoachings(req.userId!) });
});

communitiesRouter.use(requireAuth);
/** Names only — a community never exposes other members' private data. */
communitiesRouter.get('/mine', async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ communities: await listMyCommunities(req.userId!) });
});
