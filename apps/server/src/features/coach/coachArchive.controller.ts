import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { endCoachingByCoach, getArchivedTrainee, listArchivedTrainees, listArchivedWorkoutLogs } from './coachArchive.service';

/** After loadCoachTrainee (her live coaching). A second call after the end is a 404 from the middleware. */
export async function patchEndCoaching(req: AuthenticatedRequest, res: Response) {
  const endedAt = (await endCoachingByCoach(req.userId!, req.traineeId!, req.coachingId!)) ?? new Date();
  res.status(200).json({ endedAt: endedAt.toISOString() });
}

export async function getArchive(req: AuthenticatedRequest, res: Response) {
  const now = new Date();
  res.status(200).json({ items: await listArchivedTrainees(req.userId!), serverTime: now.toISOString() });
}

// Below: after loadCoachArchivedTrainee (an ended coaching of this coach — req.coachingId).

export async function getArchivedTraineeDetail(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ trainee: await getArchivedTrainee(req.traineeId!, req.coachingId!) });
}

export async function getArchivedTraineeWorkoutLogs(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ items: await listArchivedWorkoutLogs(req.coachingId!) });
}
