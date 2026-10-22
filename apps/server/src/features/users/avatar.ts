import type { PrivatePhoto } from '@sistem/types';
import { PhotoStorageUnavailableError, toPublicPhoto } from '../privatePhotos/privatePhoto.service';
import type { UserDocument } from './user.model';

/**
 * The API shape of a stored avatar, or null. A missing photo store never breaks the account
 * response (login, /auth/me): the photo is simply not shown.
 */
export function toPublicAvatar(avatar: UserDocument['avatar']): PrivatePhoto | null {
  if (!avatar) return null;
  try {
    return toPublicPhoto(avatar);
  } catch (error) {
    if (error instanceof PhotoStorageUnavailableError) return null;
    throw error;
  }
}
