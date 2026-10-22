import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
  deleteMyOwnCardioWorkout,
  getMyCardioWorkout,
  getMyOwnCardioWorkout,
  getMyOwnCardioWorkouts,
  postMyCardioLog,
  postMyOwnCardioWorkout,
  putMyOwnCardioWorkout,
} from './cardio.controller';

// The trainee's cardio workouts (plan workouts of kind 'cardio') and her logs, scoped to the caller.
// The coach builds them in the plan builder and reads the logs through /api/coach/trainees/:id/cardio-logs.
export const cardioRouter = Router();

cardioRouter.use(requireAuth, requireRole('trainee'));

cardioRouter.get('/plans/:planId/workouts/:workoutId', getMyCardioWorkout);
cardioRouter.post('/logs', postMyCardioLog);
// Her own cardio workouts (self-guided "build a run"), outside any plan.
cardioRouter.get('/own', getMyOwnCardioWorkouts);
cardioRouter.post('/own', postMyOwnCardioWorkout);
cardioRouter.get('/own/:id', getMyOwnCardioWorkout);
cardioRouter.put('/own/:id', putMyOwnCardioWorkout);
cardioRouter.delete('/own/:id', deleteMyOwnCardioWorkout);
