import { useState } from 'react';
import { useAuth } from '../../../services/auth/AuthContext';
import { removeAvatar, uploadAvatar } from '../../../services/users/usersService';
import { useMyAvatar } from '../../../hooks/useMyAvatar';

/**
 * Her profile photo: save a cropped JPEG or remove it. The account in AuthContext is updated, so
 * every screen that shows her avatar follows. A failed save throws and keeps the old photo.
 */
export function useAvatarUpload() {
  const { updateUser } = useAuth();
  const { url, hasAvatar, refreshExpired } = useMyAvatar();
  const [isUploading, setIsUploading] = useState(false);

  async function save(photo: Blob) {
    setIsUploading(true);
    try {
      const updated = await uploadAvatar(photo);
      updateUser({ avatar: updated.avatar });
    } finally {
      setIsUploading(false);
    }
  }

  async function remove() {
    setIsUploading(true);
    try {
      const updated = await removeAvatar();
      updateUser({ avatar: updated.avatar });
    } finally {
      setIsUploading(false);
    }
  }

  return { avatarUrl: url, hasAvatar, isUploading, save, remove, refreshExpired };
}
