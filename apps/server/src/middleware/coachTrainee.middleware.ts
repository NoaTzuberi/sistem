import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Coaching } from '../features/coachings/coaching.model';
import type { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../i18n';

/**
 * Use after requireAuth + requireRole('coach') on routes with :traineeId. Lets the request through
 * only while the calling coach has a LIVE coaching with that trainee, and sets req.coachingId:
 * coach-owned data (plans, logs, nutrition, notes, AI drafts) is read through that coaching only;
 * trainee-owned data (questionnaire, body, photos, profile) through req.traineeId. A trainee of
 * another coach gets the same 404 as a missing one, so ids can't be probed.
 */
export async function loadCoachTrainee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { traineeId } = req.params;
  if (typeof traineeId !== 'string' || !mongoose.isValidObjectId(traineeId)) {
    sendError(res, 400, 'invalid_trainee_id');
    return;
  }

  const coaching = await Coaching.findOne({ traineeId, coachId: req.userId, live: true }).select('_id').lean();
  if (!coaching) {
    sendError(res, 404, 'trainee_not_found');
    return;
  }

  req.traineeId = traineeId;
  req.coachingId = String(coaching._id);
  next();
}

/**
 * The coach's read-only archive (/coach/archive/:traineeId): lets the request through only for a trainee
 * whose coaching with the calling coach ENDED and who has no live one with her again (then the live routes
 * apply). Sets req.coachingId to the newest ended coaching — archive services read only through it.
 */
export async function loadCoachArchivedTrainee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { traineeId } = req.params;
  if (typeof traineeId !== 'string' || !mongoose.isValidObjectId(traineeId)) {
    sendError(res, 400, 'invalid_trainee_id');
    return;
  }

  const [ended, live] = await Promise.all([
    Coaching.findOne({ traineeId, coachId: req.userId, status: 'ended' }).sort({ endedAt: -1 }).select('_id').lean(),
    Coaching.exists({ traineeId, coachId: req.userId, live: true }),
  ]);
  if (!ended || live) {
    sendError(res, 404, 'trainee_not_found');
    return;
  }

  req.traineeId = traineeId;
  req.coachingId = String(ended._id);
  next();
}
