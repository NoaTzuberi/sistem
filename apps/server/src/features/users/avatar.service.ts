import type { AuthUser, PrivatePhoto } from '@sistem/types';
import { AVATAR_PHOTO_FOLDER } from '../privatePhotos/privatePhoto.constants';
import { deletePrivatePhoto, uploadPrivatePhoto } from '../privatePhotos/privatePhoto.service';
import { toPublicAvatar } from './avatar';
import { isAcceptedImage } from '../privatePhotos/privatePhoto.validation';
import { toPublicUser } from '../auth/auth.service';
import { User } from './user.model';
import type { UserDocument } from './user.model';
import { UserNotFoundError } from './users.service';
import { LocalizedError } from '../../i18n';

// The profile photo: private like every personal photo (PRD §11) — stored as an authenticated
// asset under her id, seen only through expiring signed links. Visible to her and her coach.

export class InvalidAvatarError extends LocalizedError {}

async function deleteQuietly(publicId: string): Promise<void> {
  try {
    await deletePrivatePhoto(publicId);
  } catch (error) {
    console.error(`[avatar] could not delete ${publicId}`, error);
  }
}

/** Uploads (or replaces) her profile photo; the old one is deleted from storage. */
export async function setAvatar(userId: string, data: Buffer, now: Date = new Date()): Promise<AuthUser> {
  if (!isAcceptedImage(data)) throw new InvalidAvatarError('photo_invalid_image');
  const publicId = await uploadPrivatePhoto(data, `${AVATAR_PHOTO_FOLDER}/${userId}`, 'avatar');
  // The document as it was, so a concurrent upload deletes exactly the photo it replaced.
  const previous = await User.findByIdAndUpdate(userId, { $set: { avatar: { publicId, uploadedAt: now } } }, { returnDocument: 'before' })
    .select('avatar')
    .lean<Pick<UserDocument, 'avatar'>>();
  if (!previous) {
    await deleteQuietly(publicId);
    throw new UserNotFoundError('user_not_found');
  }
  if (previous.avatar) await deleteQuietly(previous.avatar.publicId);
  return currentUser(userId);
}

export async function removeAvatar(userId: string): Promise<AuthUser> {
  const previous = await User.findByIdAndUpdate(userId, { $set: { avatar: null } }, { returnDocument: 'before' })
    .select('avatar')
    .lean<Pick<UserDocument, 'avatar'>>();
  if (!previous) throw new UserNotFoundError('user_not_found');
  if (previous.avatar) await deleteQuietly(previous.avatar.publicId);
  return currentUser(userId);
}

/** A fresh signed link (the one she has expired). */
export async function getAvatar(userId: string): Promise<PrivatePhoto | null> {
  const user = await User.findById(userId).select('avatar').lean<Pick<UserDocument, 'avatar'>>();
  if (!user) throw new UserNotFoundError('user_not_found');
  return toPublicAvatar(user.avatar);
}

async function currentUser(userId: string): Promise<AuthUser> {
  const user = await User.findById(userId);
  if (!user) throw new UserNotFoundError('user_not_found');
  return toPublicUser(user);
}
