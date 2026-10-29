import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getCoaches, patchCoach, postCoach, postPasswordLink, postResetLink } from './admin.controller';
import {
  deleteSystemFoodItem,
  getSystemFoods,
  patchSystemFood,
  postRestoreSystemFood,
  postSystemFood,
} from '../nutrition/nutrition.controller';

// Platform admin only (role read from the database on every request). Coach accounts and the system food
// bank, never trainee data.
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));
adminRouter.get('/coaches', getCoaches);
adminRouter.post('/coaches', postCoach);
adminRouter.post('/coaches/:coachId/password-link', postPasswordLink);
adminRouter.post('/coaches/:coachId/reset-link', postResetLink);
adminRouter.patch('/coaches/:coachId', patchCoach);
// The system food bank (owner 2026-10-28): every coach and trainee sees it; coaches only copy, hide or restore.
adminRouter.get('/foods', getSystemFoods);
adminRouter.post('/foods', postSystemFood);
adminRouter.patch('/foods/:foodId', patchSystemFood);
adminRouter.delete('/foods/:foodId', deleteSystemFoodItem);
adminRouter.post('/foods/:foodId/restore', postRestoreSystemFood);
