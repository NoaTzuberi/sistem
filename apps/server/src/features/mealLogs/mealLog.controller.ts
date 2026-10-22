import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { PhotoStorageUnavailableError } from '../privatePhotos/privatePhoto.service';
import {
  InvalidMealPhotoError,
  MealLogDayError,
  MealLogNoPlanError,
  MealPhotoNotFoundError,
  addMyMealPhoto,
  getCoachMealLogWeek,
  getMyMealLogDays,
  removeMyMealPhoto,
  saveMyMealLog,
} from './mealLog.service';
import { parseOwnTargetPayload } from '../ownNutrition/ownNutritionTarget.validation';
import { saveOwnTarget } from '../ownNutrition/ownNutritionTarget.service';
import {
  parseSaveMealLogPayload,
  validateMealIdParam,
  validateMealLogDateParam,
  validateWeekStartQuery,
} from './mealLog.validation';
import { sendError } from '../../i18n';

/** Maps the portion tracking errors to HTTP; anything else goes to the error handler. */
function sendMealLogError(res: Response, error: unknown): void {
  if (error instanceof MealLogDayError || error instanceof InvalidMealPhotoError) {
    sendError(res, 400, error.serverMessage);
  } else if (error instanceof MealPhotoNotFoundError) {
    sendError(res, 404, error.serverMessage);
  } else if (error instanceof MealLogNoPlanError) {
    sendError(res, 409, error.serverMessage);
  } else if (error instanceof PhotoStorageUnavailableError) {
    sendError(res, 503, error.serverMessage);
  } else {
    throw error;
  }
}

/** Runs a handler for one day: validates :date (and :mealId when the route has one), maps the errors. */
function withDate(handler: (req: AuthenticatedRequest, res: Response, date: string) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: Response) => {
    const validationError =
      validateMealLogDateParam(req.params.date) ??
      (req.params.mealId !== undefined ? validateMealIdParam(req.params.mealId) : null) ??
      (req.params.photoId !== undefined ? validateMealIdParam(req.params.photoId) : null);
    if (validationError) {
      sendError(res, 400, validationError);
      return;
    }
    try {
      await handler(req, res, req.params.date as string);
    } catch (error) {
      sendMealLogError(res, error);
    }
  };
}

export async function getMyMealLogs(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await getMyMealLogDays(req.userId!));
}

export const putMyMealLog = withDate(async (req, res, date) => {
  const parsed = parseSaveMealLogPayload(req.body);
  if (!parsed.value) {
    sendError(res, 400, parsed.error);
    return;
  }
  res.status(200).json({ day: await saveMyMealLog(req.userId!, date, parsed.value.eaten) });
});

/** Adds a photo to a meal. The body is the image itself (readPhotoBody); the phone has already compressed it. */
export const postMyMealPhoto = withDate(async (req, res, date) => {
  res.status(201).json({ day: await addMyMealPhoto(req.userId!, date, String(req.params.mealId), req.body as Buffer) });
});

/** :photoId = the photo's id (MealPhoto.id). */
export const deleteMyMealPhoto = withDate(async (req, res, date) => {
  res.status(200).json({ day: await removeMyMealPhoto(req.userId!, date, String(req.params.photoId)) });
});

/** PUT /meal-logs/target — her own daily portions ("היעד שלי"). */
export async function putMyOwnTarget(req: AuthenticatedRequest, res: Response) {
  const parsed = parseOwnTargetPayload(req.body);
  if (parsed.error !== undefined) return sendError(res, 400, parsed.error);
  res.status(200).json({ ownTarget: await saveOwnTarget(req.userId!, parsed.value) });
}

/** Coach (after loadCoachTrainee): one Sunday week, read-only. */
export async function getTraineeMealLogs(req: AuthenticatedRequest, res: Response) {
  const error = validateWeekStartQuery(req.query.weekStart);
  if (error) {
    sendError(res, 400, error);
    return;
  }
  res.status(200).json(await getCoachMealLogWeek(req.traineeId!, req.coachingId!, (req.query.weekStart as string | undefined) ?? null));
}
