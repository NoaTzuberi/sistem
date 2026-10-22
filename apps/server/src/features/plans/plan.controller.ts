import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { validatePlanIdParam } from './plan.validation';
import { PlanNotFoundError } from './plan.service';
import { listTraineePlans, getTraineePlan, getTraineeWeek } from './traineePlan.service';
import { sendError } from '../../i18n';
import { CoachingNotFoundError, readTraineeCoachingParam } from '../coachings/coaching.service';

/** Optional `?coachingId=` (one of hers) — the hooks are coaching-aware for the later multi-coach UI. */
async function readScope(req: AuthenticatedRequest, res: Response): Promise<string | null | undefined> {
  try {
    return await readTraineeCoachingParam(req.userId!, req.query.coachingId);
  } catch (error) {
    if (error instanceof CoachingNotFoundError) {
      sendError(res, 404, error.serverMessage);
      return undefined;
    }
    throw error;
  }
}

export async function getMyPlans(req: AuthenticatedRequest, res: Response) {
  const coachingId = await readScope(req, res);
  if (coachingId === undefined) return;
  res.status(200).json(await listTraineePlans(req.userId!, new Date(), coachingId));
}

/** This week in the trainee's time zone: the plan, each workout's status, the next workout. */
export async function getMyWeek(req: AuthenticatedRequest, res: Response) {
  const coachingId = await readScope(req, res);
  if (coachingId === undefined) return;
  res.status(200).json(await getTraineeWeek(req.userId!, new Date(), coachingId));
}

export async function getMyPlan(req: AuthenticatedRequest, res: Response) {
  const validationError = validatePlanIdParam(req.params.id);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  try {
    const plan = await getTraineePlan(String(req.params.id), req.userId!);
    res.status(200).json({ plan });
  } catch (error) {
    if (error instanceof PlanNotFoundError) {
      sendError(res, 404, error.serverMessage);
      return;
    }
    throw error;
  }
}
