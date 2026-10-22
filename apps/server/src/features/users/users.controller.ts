import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { chooseSelfGuided, getUserProfileById, updateUserPreferences, UserNotFoundError } from './users.service';
import { parsePreferencesPayload } from './users.validation';
import { sendError } from '../../i18n';
import { InvalidAvatarError, getAvatar, removeAvatar, setAvatar } from './avatar.service';
import { PhotoStorageUnavailableError } from '../privatePhotos/privatePhoto.service';

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await getUserProfileById(req.userId!);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      sendError(res, 401, error.serverMessage);
      return;
    }
    throw error;
  }
}

export async function patchPreferences(req: AuthenticatedRequest, res: Response) {
  const parsed = parsePreferencesPayload(req.body);
  if (parsed.error !== undefined) {
    sendError(res, 400, parsed.error);
    return;
  }
  try {
    res.status(200).json({ user: await updateUserPreferences(req.userId!, parsed.value) });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      sendError(res, 401, error.serverMessage);
      return;
    }
    throw error;
  }
}

/** Maps the avatar errors to HTTP; anything else goes to the error handler. */
async function withAvatarErrors(res: Response, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    if (error instanceof UserNotFoundError) sendError(res, 401, error.serverMessage);
    else if (error instanceof InvalidAvatarError) sendError(res, 400, error.serverMessage);
    else if (error instanceof PhotoStorageUnavailableError) sendError(res, 503, error.serverMessage);
    else throw error;
  }
}

export async function putMyAvatar(req: AuthenticatedRequest, res: Response) {
  await withAvatarErrors(res, async () => {
    res.status(200).json({ user: await setAvatar(req.userId!, req.body as Buffer) });
  });
}

export async function deleteMyAvatar(req: AuthenticatedRequest, res: Response) {
  await withAvatarErrors(res, async () => {
    res.status(200).json({ user: await removeAvatar(req.userId!) });
  });
}

export async function getMyAvatar(req: AuthenticatedRequest, res: Response) {
  await withAvatarErrors(res, async () => {
    res.status(200).json({ avatar: await getAvatar(req.userId!) });
  });
}

/** First run: "on my own" — no coach, straight to the questionnaire (POST /users/me/self-guided). */
export async function postSelfGuided(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ user: await chooseSelfGuided(req.userId!) });
}
