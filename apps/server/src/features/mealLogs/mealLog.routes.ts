import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { readPhotoBody } from '../privatePhotos/privatePhoto.middleware';
import { deleteMyMealPhoto, getMyMealLogs, postMyMealPhoto, putMyMealLog, putMyOwnTarget } from './mealLog.controller';

// The trainee's portion tracking (Phase 13a+, PRD §5.6), one day per :date ('YYYY-MM-DD'
// in her time zone, today and the 6 days before). Every call is scoped to the caller; the
// coach reads a trainee's week through /api/coach.
export const mealLogsRouter = Router();

mealLogsRouter.use(requireAuth, requireRole('trainee'));

mealLogsRouter.get('/', getMyMealLogs);
// Her own target ("היעד שלי") — before '/:date'.
mealLogsRouter.put('/target', putMyOwnTarget);
mealLogsRouter.put('/:date', putMyMealLog);
// A meal can hold several photos a day: POST adds one, DELETE removes one by its id.
mealLogsRouter.post('/:date/photos/:mealId', readPhotoBody, postMyMealPhoto);
mealLogsRouter.delete('/:date/photos/:photoId', deleteMyMealPhoto);
