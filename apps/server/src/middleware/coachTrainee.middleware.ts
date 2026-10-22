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
