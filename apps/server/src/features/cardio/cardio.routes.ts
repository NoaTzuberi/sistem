import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getMyCardioSession, getMyCardioWeek, postMyCardioLog } from './cardio.controller';

// The trainee's cardio sessions and logs, scoped to the caller. The coach builds sessions and
// reads logs through /api/coach/trainees/:traineeId/cardio.
export const cardioRouter = Router();

cardioRouter.use(requireAuth, requireRole('trainee'));

cardioRouter.get('/week', getMyCardioWeek);
cardioRouter.get('/sessions/:sessionId', getMyCardioSession);
cardioRouter.post('/logs', postMyCardioLog);
