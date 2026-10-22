import type { Response } from 'express';
import { Types } from 'mongoose';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendError } from '../../i18n';
import { findLiveCoaching } from '../coachings/coaching.service';
import {
  FamilyNotFoundError,
  FamilyRequestError,
  getFamilyDetail,
  getFamilyHistory,
  mergeFamilies,
  searchFamilies,
  setFamilyPrimary,
  splitFamily,
  updateFamily,
} from './exerciseFamily.service';
import { parseFamilySearchQuery, parseIdList, parseUpdateFamilyPayload } from './exerciseFamily.validation';

// /api/coach/exercise-families (Phase 12b): the slot-filtered picker and the library review screen.

async function handle(res: Response, run: () => Promise<unknown>) {
  try {
    res.status(200).json(await run());
  } catch (error) {
    if (error instanceof FamilyNotFoundError) return sendError(res, 404, error.serverMessage);
    if (error instanceof FamilyRequestError) return sendError(res, 400, error.serverMessage);
    throw error;
  }
}

/** A traineeId in a query must be one of this coach's trainees — a live coaching (same 404 as a missing one). */
async function traineeIsHers(coachId: string, traineeId: string | undefined): Promise<boolean> {
  if (!traineeId) return true;
  return (await findLiveCoaching(traineeId, coachId)) !== null;
}

export async function getFamilies(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseFamilySearchQuery(req.query as Record<string, unknown>);
  if (error) return sendError(res, 400, error);
  if (!(await traineeIsHers(req.userId!, value.traineeId))) return sendError(res, 404, 'trainee_not_found');
  await handle(res, () => searchFamilies(req.userId!, value));
}

function familyIdParam(req: AuthenticatedRequest, res: Response): string | null {
  const { familyId } = req.params;
  if (typeof familyId !== 'string' || !Types.ObjectId.isValid(familyId)) {
    sendError(res, 400, 'family_invalid_id');
    return null;
  }
  return familyId;
}

export async function getFamily(req: AuthenticatedRequest, res: Response) {
  const familyId = familyIdParam(req, res);
  if (!familyId) return;
  const traineeId = typeof req.query.traineeId === 'string' && Types.ObjectId.isValid(req.query.traineeId) ? req.query.traineeId : undefined;
  if (!(await traineeIsHers(req.userId!, traineeId))) return sendError(res, 404, 'trainee_not_found');
  await handle(res, () => getFamilyDetail(familyId, traineeId));
}

export async function patchFamily(req: AuthenticatedRequest, res: Response) {
  const familyId = familyIdParam(req, res);
  if (!familyId) return;
  const { value, error } = parseUpdateFamilyPayload(req.body);
  if (error) return sendError(res, 400, error);
  await handle(res, () => updateFamily(familyId, value));
}

export async function putFamilyPrimary(req: AuthenticatedRequest, res: Response) {
  const familyId = familyIdParam(req, res);
  if (!familyId) return;
  const exerciseId = (req.body as { exerciseId?: unknown } | undefined)?.exerciseId;
  if (typeof exerciseId !== 'string') return sendError(res, 400, 'invalid_body');
  await handle(res, () => setFamilyPrimary(familyId, exerciseId));
}

export async function postFamilyMerge(req: AuthenticatedRequest, res: Response) {
  const familyId = familyIdParam(req, res);
  if (!familyId) return;
  const sourceId = (req.body as { familyId?: unknown } | undefined)?.familyId;
  if (typeof sourceId !== 'string' || !Types.ObjectId.isValid(sourceId)) return sendError(res, 400, 'family_invalid_id');
  await handle(res, () => mergeFamilies(familyId, sourceId));
}

export async function postFamilySplit(req: AuthenticatedRequest, res: Response) {
  const familyId = familyIdParam(req, res);
  if (!familyId) return;
  const ids = parseIdList((req.body as { exerciseIds?: unknown } | undefined)?.exerciseIds);
  if (!ids) return sendError(res, 400, 'family_split_invalid');
  await handle(res, () => splitFamily(familyId, ids));
}

/** Runs after loadCoachTrainee. */
export async function getTraineeFamilyHistory(req: AuthenticatedRequest, res: Response) {
  const familyId = typeof req.query.familyId === 'string' ? req.query.familyId : '';
  if (!Types.ObjectId.isValid(familyId)) return sendError(res, 400, 'family_invalid_id');
  await handle(res, () => getFamilyHistory(req.traineeId!, req.coachingId!, familyId));
}
