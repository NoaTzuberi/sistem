import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import type { PrivatePhoto as PublicPrivatePhoto } from '@sistem/types';
import { config } from '../../config/env';
import { MAX_STORED_PHOTO_EDGE_PX, PHOTO_URL_TTL_SEC } from './privatePhoto.constants';
import { LocalizedError } from '../../i18n';

// The one place that talks to Cloudinary about personal photos. Assets are uploaded as
// `authenticated` (never reachable by a public URL) and viewed only through expiring
// signed download links (`private_download_url` + expires_at). Cloudinary's CDN signed
// URLs would never expire, and expiring CDN tokens are a paid add-on — if that is
// added later, only photoUrl() changes.

const STORED_FORMAT = 'jpg';

export class PhotoStorageUnavailableError extends LocalizedError {}

function cloudinaryOptions() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new PhotoStorageUnavailableError('photo_storage_unavailable');
  }
  return { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true };
}

/** Uploads one image as a private asset into `folder`; returns its public id. */
export async function uploadPrivatePhoto(data: Buffer, folder: string, name: string): Promise<string> {
  const options = cloudinaryOptions();
  // A fresh id per upload: a replaced photo never shares a link with the old one.
  const publicId = `${folder}/${name}-${crypto.randomBytes(6).toString('hex')}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        ...options,
        resource_type: 'image',
        type: 'authenticated',
        public_id: publicId,
        asset_folder: folder,
        format: STORED_FORMAT,
        overwrite: false,
        transformation: [{ width: MAX_STORED_PHOTO_EDGE_PX, height: MAX_STORED_PHOTO_EDGE_PX, crop: 'limit' }],
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error('Photo upload failed.'));
        else resolve(result.public_id);
      },
    );
    stream.end(data);
  });
}

/** Removes a photo for good (replaced, removed, later: account deleted). */
export async function deletePrivatePhoto(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    ...cloudinaryOptions(),
    resource_type: 'image',
    type: 'authenticated',
    invalidate: true,
  });
}

/** Whether Cloudinary is configured at all (an account with no photos can be deleted without it). */
export function isPhotoStorageConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * Account deletion: removes every private photo stored under `prefix` (e.g. `sistem/avatars/<userId>/`),
 * including any the database lost track of, then lists the folder again. Returns how many are still
 * there (0 = really gone) — the caller refuses to finish the deletion otherwise.
 */
export async function deletePrivatePhotosByPrefix(prefix: string): Promise<number> {
  const options = { ...cloudinaryOptions(), resource_type: 'image', type: 'authenticated', invalidate: true };
  // Cloudinary deletes up to 1000 per call and answers `partial` while more are left.
  for (let round = 0; round < 10; round += 1) {
    const result = (await cloudinary.api.delete_resources_by_prefix(prefix, options)) as { partial?: boolean };
    if (!result.partial) break;
  }
  const left = (await cloudinary.api.resources({ ...cloudinaryOptions(), resource_type: 'image', type: 'authenticated', prefix, max_results: 10 })) as {
    resources?: unknown[];
  };
  return left.resources?.length ?? 0;
}

/** A signed link to the photo that stops working after PHOTO_URL_TTL_SEC. */
export function photoUrl(publicId: string, now: Date = new Date()): { url: string; urlExpiresAt: string } {
  const expiresAt = Math.floor(now.getTime() / 1000) + PHOTO_URL_TTL_SEC;
  const url = cloudinary.utils.private_download_url(publicId, STORED_FORMAT, {
    ...cloudinaryOptions(),
    resource_type: 'image',
    type: 'authenticated',
    expires_at: expiresAt,
  });
  return { url, urlExpiresAt: new Date(expiresAt * 1000).toISOString() };
}

/** The API shape of a stored photo — the storage id itself is never sent. */
export function toPublicPhoto(photo: { publicId: string; uploadedAt: Date }): PublicPrivatePhoto {
  return { uploadedAt: photo.uploadedAt.toISOString(), ...photoUrl(photo.publicId) };
}
