import { Router } from 'express';
import { deleteMyAvatar, getMyAvatar, getProfile, patchPreferences, postSelfGuided, putMyAvatar } from './users.controller';
import { readPhotoBody } from '../privatePhotos/privatePhoto.middleware';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

// Onboarding answers are written through /api/onboarding (Phase 3).
export const usersRouter = Router();

usersRouter.get('/profile', requireAuth, getProfile);
// Display units for body tracking (Phase 10, Settings).
usersRouter.patch('/preferences', requireAuth, patchPreferences);
// Her profile photo: a cropped JPEG as the raw body; private, signed links only.
usersRouter.get('/me/avatar', requireAuth, getMyAvatar);
usersRouter.put('/me/avatar', requireAuth, readPhotoBody, putMyAvatar);
usersRouter.delete('/me/avatar', requireAuth, deleteMyAvatar);
usersRouter.post('/me/self-guided', requireAuth, requireRole('trainee'), postSelfGuided);
