import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { logSecurityEvent } from '../../middleware/securityLog';
import { parseAccountDeletion } from './account.validation';
import {
  AccountConfirmRequiredError,
  AccountPasswordWrongError,
  AdminAccountDeletionError,
  CoachHasTraineesError,
  PhotoCleanupFailedError,
  deleteOwnAccount,
} from './account.service';

/** DELETE /api/account — her own account only (the id is the token's). 204 when it is gone. */
export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  const parsed = parseAccountDeletion(req.body ?? {});
  if (parsed.error !== undefined) {
    sendError(res, 400, parsed.error);
    return;
  }
  try {
    await deleteOwnAccount(req.userId!, parsed.value);
  } catch (error) {
    if (error instanceof AccountConfirmRequiredError) return sendError(res, 400, error.serverMessage);
    if (error instanceof AccountPasswordWrongError) return sendError(res, 403, error.serverMessage);
    if (error instanceof AdminAccountDeletionError) return sendError(res, 403, error.serverMessage);
    if (error instanceof CoachHasTraineesError) return sendError(res, 409, error.serverMessage);
    if (error instanceof PhotoCleanupFailedError) return sendError(res, 503, error.serverMessage);
    throw error;
  }
  // The user id only: no ip, email or name (the request is not passed on purpose).
  logSecurityEvent('account_deleted', undefined, { userId: req.userId });
  res.status(204).end();
}
