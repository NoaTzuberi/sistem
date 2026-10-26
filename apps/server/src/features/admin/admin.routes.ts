import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getCoaches, patchCoach, postCoach, postPasswordLink, postResetLink } from './admin.controller';

// Platform admin only (role read from the database on every request). Coach accounts, never trainee data.
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));
adminRouter.get('/coaches', getCoaches);
adminRouter.post('/coaches', postCoach);
adminRouter.post('/coaches/:coachId/password-link', postPasswordLink);
adminRouter.post('/coaches/:coachId/reset-link', postResetLink);
adminRouter.patch('/coaches/:coachId', patchCoach);
