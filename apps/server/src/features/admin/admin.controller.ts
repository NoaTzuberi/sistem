import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { logSecurityEvent } from '../../middleware/securityLog';
import {
  AdminTargetRefusedError,
  AdminUserNotFoundError,
  CoachEmailTakenError,
  CoachNotFoundError,
  NotTestAccountError,
  changeTestAccountEmail,
  createCoach,
  createResetLink,
  createUserResetLink,
  listCoaches,
  resendPasswordLink,
  searchUsers,
  setCoachStatus,
} from './admin.service';
import { parseChangeEmailPayload, parseCoachStatus, parseCreateCoachPayload, parseUserSearchQuery } from './admin.validation';

function sendAdminError(res: Response, error: unknown): void {
  if (error instanceof CoachEmailTakenError) return sendError(res, 409, error.serverMessage);
  if (error instanceof CoachNotFoundError || error instanceof AdminUserNotFoundError) return sendError(res, 404, error.serverMessage);
  if (error instanceof AdminTargetRefusedError || error instanceof NotTestAccountError) return sendError(res, 409, error.serverMessage);
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
    const created = await createCoach(req.userId!, value.name, value.email);
    logSecurityEvent('admin_action', req, { userId: req.userId, action: 'create_coach' });
    res.status(201).json(created);
  } catch (createError) {
    sendAdminError(res, createError);
  }
}

export async function postResetLink(req: AuthenticatedRequest, res: Response) {
  const id = readCoachId(req, res);
  if (!id) return;
  try {
    const link = await createResetLink(id);
    logSecurityEvent('admin_action', req, { userId: req.userId, action: 'coach_reset_link', coachId: id });
    res.status(200).json(link);
  } catch (error) {
    sendAdminError(res, error);
  }
}

export async function postPasswordLink(req: AuthenticatedRequest, res: Response) {
  const id = readCoachId(req, res);
  if (!id) return;
  try {
    const link = await resendPasswordLink(id);
    logSecurityEvent('admin_action', req, { userId: req.userId, action: 'coach_password_link', coachId: id });
    res.status(200).json(link);
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
    const coach = await setCoachStatus(id, status);
    logSecurityEvent('admin_action', req, { userId: req.userId, action: `coach_${status}`, coachId: id });
    res.status(200).json({ coach });
  } catch (error) {
    sendAdminError(res, error);
  }
}

function readUserId(req: AuthenticatedRequest, res: Response): string | null {
  const id = String(req.params.userId);
  if (!mongoose.isValidObjectId(id)) {
    sendError(res, 404, 'admin_user_not_found');
    return null;
  }
  return id;
}

export async function getUsers(req: AuthenticatedRequest, res: Response) {
  const query = parseUserSearchQuery(req.query.q);
  if (!query) return sendError(res, 400, 'admin_user_search_short');
  res.status(200).json({ users: await searchUsers(query) });
}

/** The link is in this answer only; the log line holds the two ids, never the link or an email. */
export async function postUserResetLink(req: AuthenticatedRequest, res: Response) {
  const id = readUserId(req, res);
  if (!id) return;
  try {
    const link = await createUserResetLink(id);
    logSecurityEvent('admin_action', req, { userId: req.userId, action: 'user_reset_link', targetUserId: id });
    res.status(200).json(link);
  } catch (error) {
    sendAdminError(res, error);
  }
}

export async function patchUserEmail(req: AuthenticatedRequest, res: Response) {
  const id = readUserId(req, res);
  if (!id) return;
  const email = parseChangeEmailPayload(req.body);
  if (!email) return sendError(res, 400, 'email_invalid');
  try {
    const user = await changeTestAccountEmail(id, email);
    logSecurityEvent('admin_action', req, { userId: req.userId, action: 'test_account_email', targetUserId: id });
    res.status(200).json({ user });
  } catch (error) {
    sendAdminError(res, error);
  }
}
