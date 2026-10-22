import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { readPhotoBody } from '../privatePhotos/privatePhoto.middleware';
import {
  deleteMyPumpPhoto,
  getFreeExercises,
  getMyActiveSession,
  getMySession,
  getMyWorkoutLog,
  getMyWorkoutLogs,
  patchMySets,
  patchMySummary,
  postAbandonWorkout,
  postFinishWorkout,
  postFreeExercise,
  postStartFreeWorkout,
  postStartWorkout,
  putMyPumpPhoto,
} from './workoutLog.controller';

// The trainee's own workout logs, the active session (Phase 8, PRD §5.2) and the
// summary + Daily Pump photo (Phase 9, PRD §5.3). Every call is scoped to the caller:
// another trainee's log is simply not found.
export const workoutLogsRouter = Router();

workoutLogsRouter.use(requireAuth);

workoutLogsRouter.get('/', getMyWorkoutLogs);
workoutLogsRouter.post('/', postStartWorkout);
// Before '/:id', or 'active' would be read as a log id.
workoutLogsRouter.get('/active', getMyActiveSession);
// Free workouts: her own, outside the plan (trainee-owned; a coach she has sees them as history).
workoutLogsRouter.post('/free', requireRole('trainee'), postStartFreeWorkout);
workoutLogsRouter.get('/free/exercises', requireRole('trainee'), getFreeExercises);
workoutLogsRouter.get('/:id', getMyWorkoutLog);
workoutLogsRouter.get('/:id/session', getMySession);
workoutLogsRouter.patch('/:id/sets', patchMySets);
workoutLogsRouter.post('/:id/exercises', postFreeExercise);
workoutLogsRouter.post('/:id/finish', postFinishWorkout);
workoutLogsRouter.post('/:id/abandon', postAbandonWorkout);
workoutLogsRouter.patch('/:id/summary', patchMySummary);
workoutLogsRouter.put('/:id/pump-photo', readPhotoBody, putMyPumpPhoto);
workoutLogsRouter.delete('/:id/pump-photo', deleteMyPumpPhoto);
