import type { Response } from 'express';
import type { JoinResponse } from '@sistem/types';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { OtherCoachError } from '../coachings/coaching.service';
import { getCurrentUser } from '../auth/auth.service';
import {
  InviteForbiddenError,
  InviteNotFoundError,
  InviteProblemError,
  createPersonalInvite,
  extractInviteCode,
  getCoachInvites,
  getCommunityInvite,
  previewInvite,
  redeemInvite,
  regeneratePermanentInvite,
  revokeInvite,
} from './invite.service';
import { parsePersonalInvitePayload, parseInviteTypeParam } from './invite.validation';

/** Every invite error → its status; anything else is rethrown (500). */
function sendInviteError(res: Response, error: unknown): void {
  if (error instanceof InviteProblemError) {
    // Unknown code → 404; a code that existed but can't be used any more → 410.
    sendError(res, error.problem === 'invalid' ? 404 : 410, error.serverMessage, { problem: error.problem });
    return;
  }
  if (error instanceof InviteForbiddenError) return sendError(res, 403, error.serverMessage);
  if (error instanceof OtherCoachError) return sendError(res, 409, error.serverMessage, { otherCoachName: error.otherCoachName });
  if (error instanceof InviteNotFoundError) return sendError(res, 404, error.serverMessage);
  throw error;
}

// --- Public join (/api/join) ---------------------------------------------------

export async function getJoinPreview(req: AuthenticatedRequest, res: Response) {
  try {
    res.status(200).json(await previewInvite(extractInviteCode(String(req.params.code)), req.userId ?? null));
  } catch (error) {
    sendInviteError(res, error);
  }
}

export async function postJoin(req: AuthenticatedRequest, res: Response) {
  try {
    const { result, coachName } = await redeemInvite(req.userId!, extractInviteCode(String(req.params.code)));
    const body: JoinResponse = { result, coachName, user: await getCurrentUser(req.userId!) };
    res.status(200).json(body);
  } catch (error) {
    sendInviteError(res, error);
  }
}

// --- Coach (/api/coach/invites) --------------------------------------------------

export async function getMyInvites(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await getCoachInvites(req.userId!));
}

export async function postPersonalInvite(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parsePersonalInvitePayload(req.body);
  if (!value) return sendError(res, 400, error);
  res.status(201).json({ invite: await createPersonalInvite(req.userId!, value.targetEmail) });
}

/** POST /coach/invites/regenerate { type? } — a new permanent link; the old one stops working. */
export async function postRegenerateInvite(req: AuthenticatedRequest, res: Response) {
  const type = parseInviteTypeParam(req.body?.type);
  if (!type) return sendError(res, 400, 'invite_type_invalid');
  res.status(200).json({ invite: await regeneratePermanentInvite(req.userId!, type) });
}

export async function deleteInvite(req: AuthenticatedRequest, res: Response) {
  try {
    await revokeInvite(req.userId!, String(req.params.inviteId));
    res.status(204).end();
  } catch (error) {
    sendInviteError(res, error);
  }
}

/** Her community-only link (no coaching, no private data access). */
export async function getMyCommunityInvite(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ invite: await getCommunityInvite(req.userId!) });
}
