import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import {
  archiveOwnCardioWorkout,
  createOwnCardioWorkout,
  getOwnCardioWorkout,
  listOwnCardioWorkouts,
  updateOwnCardioWorkout,
  CardioConflictError,
  CardioNotFoundError,
  CardioRequestError,
  getTraineeCardioWorkout,
  listCoachCardioLogs,
  saveTraineeCardioLog,
} from './cardio.service';
import { parseOwnCardioWorkoutPayload, parseSaveCardioLogPayload, validateObjectId } from './cardio.validation';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

/** Maps the cardio errors to HTTP; anything else goes to the error handler. */
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof CardioRequestError) sendError(res, 400, error.serverMessage);
      else if (error instanceof CardioNotFoundError) sendError(res, 404, error.serverMessage);
      else if (error instanceof CardioConflictError) sendError(res, 409, error.serverMessage);
      else throw error;
    }
  };
}

/* Trainee */

export const getMyCardioWorkout = handled(async (req, res) => {
  const error = validateObjectId(req.params.planId) ?? validateObjectId(req.params.workoutId);
  if (error) {
    sendError(res, 400, error);
    return;
  }
  res.status(200).json(await getTraineeCardioWorkout(req.userId!, req.params.planId as string, req.params.workoutId as string));
});

export const postMyCardioLog = handled(async (req, res) => {
  const parsed = parseSaveCardioLogPayload(req.body);
  if (!parsed.value) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(201).json({ log: await saveTraineeCardioLog(req.userId!, parsed.value) });
});

/* Her own cardio workouts (self-guided) */

export const getMyOwnCardioWorkouts = handled(async (req, res) => {
  res.status(200).json(await listOwnCardioWorkouts(req.userId!));
});

export const getMyOwnCardioWorkout = handled(async (req, res) => {
  const error = validateObjectId(req.params.id);
  if (error) return sendError(res, 400, error);
  res.status(200).json(await getOwnCardioWorkout(req.userId!, req.params.id as string));
});

export const postMyOwnCardioWorkout = handled(async (req, res) => {
  const parsed = parseOwnCardioWorkoutPayload(req.body);
  if (!parsed.value) return sendError(res, 400, parsed.error);
  const id = await createOwnCardioWorkout(req.userId!, parsed.value);
  res.status(201).json(await getOwnCardioWorkout(req.userId!, id));
});

export const putMyOwnCardioWorkout = handled(async (req, res) => {
  const error = validateObjectId(req.params.id);
  if (error) return sendError(res, 400, error);
  const parsed = parseOwnCardioWorkoutPayload(req.body);
  if (!parsed.value) return sendError(res, 400, parsed.error);
  await updateOwnCardioWorkout(req.userId!, req.params.id as string, parsed.value);
  res.status(200).json(await getOwnCardioWorkout(req.userId!, req.params.id as string));
});

export const deleteMyOwnCardioWorkout = handled(async (req, res) => {
  const error = validateObjectId(req.params.id);
  if (error) return sendError(res, 400, error);
  await archiveOwnCardioWorkout(req.userId!, req.params.id as string);
  res.status(204).end();
});

/* Coach (after loadCoachTrainee) */

export const getTraineeCardioLogs = handled(async (req, res) => {
  res.status(200).json(await listCoachCardioLogs(req.coachingId!, req.traineeId!));
});
