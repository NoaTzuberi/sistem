import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { CoachEmailTakenError, CoachNotFoundError, createCoach, createResetLink, listCoaches, resendPasswordLink, setCoachStatus } from './admin.service';
import { parseCoachStatus, parseCreateCoachPayload } from './admin.validation';

function sendAdminError(res: Response, error: unknown): void {
  if (error instanceof CoachEmailTakenError) return sendError(res, 409, error.serverMessage);
  if (error instanceof CoachNotFoundError) return sendError(res, 404, error.serverMessage);
  throw error;
}

function readCoachId(req: AuthenticatedRequest, res: Response): string | null {
  const id = String(req.params.coachId);
  if (!mongoose.isValidObjectId(id)) {
    sendError(res, 404, 'coach_not_found');
    return null;
  }
  return id;
}

export async function getCoaches(_req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ coaches: await listCoaches() });
}

export async function postCoach(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseCreateCoachPayload(req.body);
  if (!value) return sendError(res, 400, error);
  try {
    res.status(201).json(await createCoach(req.userId!, value.name, value.email));
  } catch (createError) {
    sendAdminError(res, createError);
  }
}

export async function postResetLink(req: AuthenticatedRequest, res: Response) {
  const id = readCoachId(req, res);
  if (!id) return;
  try {
    res.status(200).json(await createResetLink(id));
  } catch (error) {
    sendAdminError(res, error);
  }
}

export async function postPasswordLink(req: AuthenticatedRequest, res: Response) {
  const id = readCoachId(req, res);
  if (!id) return;
  try {
    res.status(200).json(await resendPasswordLink(id));
  } catch (error) {
    sendAdminError(res, error);
  }
}

export async function patchCoach(req: AuthenticatedRequest, res: Response) {
  const id = readCoachId(req, res);
  if (!id) return;
  const status = parseCoachStatus(req.body);
  if (!status) return sendError(res, 400, 'coach_status_invalid');
  try {
    res.status(200).json({ coach: await setCoachStatus(id, status) });
  } catch (error) {
    sendAdminError(res, error);
  }
}
