import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import {
  CardioConflictError,
  CardioNotFoundError,
  CardioRequestError,
  createCoachCardioSession,
  deleteCoachCardioSession,
  getCoachCardioSession,
  getTraineeCardioSession,
  getTraineeCardioWeek,
  listCoachCardio,
  saveCoachCardioSession,
  saveTraineeCardioLog,
} from './cardio.service';
import {
  parseSaveCardioLogPayload,
  parseSaveCardioSessionPayload,
  validateCardioDateQuery,
  validateCardioSessionId,
  validateCardioWeekQuery,
} from './cardio.validation';

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

/** Validates :sessionId first. */
function withSessionId(handler: (req: AuthenticatedRequest, res: Response, sessionId: string) => Promise<void>): Handler {
  return handled(async (req, res) => {
    const error = validateCardioSessionId(req.params.sessionId);
    if (error) {
      sendError(res, 400, error);
      return;
    }
    await handler(req, res, req.params.sessionId as string);
  });
}

/* Trainee */

export const getMyCardioWeek = handled(async (req, res) => {
  const error = validateCardioWeekQuery(req.query.weekStart);
  if (error) {
    sendError(res, 400, error);
    return;
  }
  res.status(200).json(await getTraineeCardioWeek(req.userId!, (req.query.weekStart as string | undefined) ?? null));
});

export const getMyCardioSession = withSessionId(async (req, res, sessionId) => {
  const error = validateCardioDateQuery(req.query.date);
  if (error) {
    sendError(res, 400, error);
    return;
  }
  res.status(200).json(await getTraineeCardioSession(req.userId!, sessionId, req.query.date as string));
});

export const postMyCardioLog = handled(async (req, res) => {
  const parsed = parseSaveCardioLogPayload(req.body);
  if (!parsed.value) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(201).json({ log: await saveTraineeCardioLog(req.userId!, parsed.value) });
});

/* Coach (after loadCoachTrainee) */

export const getTraineeCardio = handled(async (req, res) => {
  res.status(200).json(await listCoachCardio(req.traineeId!));
});

export const getTraineeCardioSessionForCoach = withSessionId(async (req, res, sessionId) => {
  res.status(200).json({ session: await getCoachCardioSession(req.traineeId!, sessionId) });
});

export const postTraineeCardioSession = handled(async (req, res) => {
  const parsed = parseSaveCardioSessionPayload(req.body);
  if (!parsed.value) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(201).json({ session: await createCoachCardioSession(req.userId!, req.traineeId!, parsed.value) });
});

export const putTraineeCardioSession = withSessionId(async (req, res, sessionId) => {
  const parsed = parseSaveCardioSessionPayload(req.body);
  if (!parsed.value) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(200).json({ session: await saveCoachCardioSession(req.traineeId!, sessionId, parsed.value) });
});

export const deleteTraineeCardioSession = withSessionId(async (req, res, sessionId) => {
  await deleteCoachCardioSession(req.traineeId!, sessionId);
  res.status(204).end();
});
