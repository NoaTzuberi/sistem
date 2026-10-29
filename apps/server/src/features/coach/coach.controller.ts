import { Response } from 'express';
import type { PlanIssuesBody } from '@sistem/types';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { listCoachTrainees, getCoachTraineeDetail } from './coach.service';
import { getCoachStats } from './coachStats.service';
import { getCoachToday } from './coachToday.service';
import { getCoachActivity } from './coachActivity.service';
import { parseActivityQuery } from './coach.validation';
import { parseStatsRange } from './coachStats';
import { PlanNotFoundError } from '../plans/plan.service';
import {
  listCoachPlans,
  getCoachPlan,
  createCoachPlan,
  saveCoachPlan,
  publishCoachPlan,
  unpublishCoachPlan,
  deleteCoachPlan,
  PlanValidationError,
  PlanConflictError,
} from '../plans/planBuilder.service';
import { validatePlanIdParam, parseCreatePlanPayload, parsePublishNotePayload, parseSavePlanPayload, type PlanProblem } from '../plans/plan.validation';
import { listWorkoutLogsForCoaching } from '../workoutLogs/workoutLog.service';
import { listBodyMetricsForTrainee } from '../bodyMetrics/bodyMetric.service';
import { getAchievementOverview } from '../achievements/achievement.service';
import { listCoachExercises } from '../exercises/exercise.service';
import type { ListCoachExercisesParams } from '../exercises/exercise.service';
import { validateExerciseListQuery } from '../exercises/exercise.validation';
import type { Muscle, Equipment, Difficulty } from '../exercises/exercise.constants';
import { listPlanWeekOptions } from '../plans/planWeekOptions.service';
import { localizeIssues, requestLanguage, sendError } from '../../i18n';

export async function getTrainees(req: AuthenticatedRequest, res: Response) {
  const now = new Date();
  const trainees = await listCoachTrainees(req.userId!, now);
  res.status(200).json({ items: trainees, serverTime: now.toISOString() });
}

/** Read-only numbers for the dashboard's Statistics and Overview pages — her own trainees only. */
export async function getStats(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await getCoachStats(req.userId!, parseStatsRange(req.query.range)));
}

/** Coach mode Today: scoreboard, waiting trainees and the attention cards. */
export async function getToday(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await getCoachToday(req.userId!));
}

/** Coach mode feed: one page of her trainees' activity, newest first (?before=<ISO>&limit=<n>). */
export async function getActivity(req: AuthenticatedRequest, res: Response) {
  const parsed = parseActivityQuery(req.query);
  if (parsed.error) {
    sendError(res, 400, parsed.error);
    return;
  }
  const now = new Date();
  res.status(200).json(await getCoachActivity(req.userId!, parsed.value.before ?? now, parsed.value.limit, now));
}

/** The plan builder's library: every imported exercise that was not rejected, facts only. */
export async function getExercises(req: AuthenticatedRequest, res: Response) {
  const validationError = validateExerciseListQuery(req.query);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  const query = req.query as Record<string, string | undefined>;
  const params: ListCoachExercisesParams = {
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    muscle: query.muscle as Muscle | undefined,
    equipment: query.equipment as Equipment | undefined,
    difficulty: query.difficulty as Difficulty | undefined,
    search: query.search,
  };
  res.status(200).json(await listCoachExercises(params));
}

// Everything below runs after loadCoachTrainee, which set req.traineeId and req.coachingId.
// Coach-owned data (plans, logs) is read through the coaching; trainee-owned data through the trainee.

export async function getTrainee(req: AuthenticatedRequest, res: Response) {
  const now = new Date();
  const trainee = await getCoachTraineeDetail(req.traineeId!, req.coachingId!, now);
  res.status(200).json({ trainee, serverTime: now.toISOString() });
}

export async function getTraineePlans(req: AuthenticatedRequest, res: Response) {
  const plans = await listCoachPlans(req.traineeId!, req.coachingId!);
  res.status(200).json({ items: plans });
}

/** The weeks a new plan can be made for (this week onwards), with what each one holds. */
export async function getTraineePlanWeeks(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await listPlanWeekOptions(req.traineeId!, req.coachingId!));
}

export async function getTraineeWorkoutLogs(req: AuthenticatedRequest, res: Response) {
  const logs = await listWorkoutLogsForCoaching(req.coachingId!, req.traineeId!);
  res.status(200).json({ items: logs });
}

/** Read-only: her weight, measurements and progress photos (signed links made for the coach). */
export async function getTraineeBodyMetrics(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await listBodyMetricsForTrainee(req.traineeId!));
}

/** Read-only: her streak and achievements. The coach's view never marks anything seen. */
export async function getTraineeAchievements(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await getAchievementOverview(req.traineeId!));
}

// --- Plan builder -----------------------------------------------------------

/** 400 with every problem worded in the request's language; the body's message is the first one. */
function sendPlanIssues(res: Response, problems: PlanProblem[]): void {
  const issues = localizeIssues(problems, requestLanguage(res.req));
  const body: PlanIssuesBody = { code: issues[0].code, message: issues[0].message, issues };
  res.status(400).json(body);
}

/** Answers the request for a known plan error; anything else is rethrown (500). */
function sendPlanError(res: Response, error: unknown): void {
  if (error instanceof PlanNotFoundError) {
    sendError(res, 404, error.serverMessage);
    return;
  }
  if (error instanceof PlanValidationError) {
    sendPlanIssues(res, error.issues);
    return;
  }
  if (error instanceof PlanConflictError) {
    sendError(res, 409, error.serverMessage);
    return;
  }
  throw error;
}

/** The :planId param, or null after answering 400. */
function readPlanId(req: AuthenticatedRequest, res: Response): string | null {
  const validationError = validatePlanIdParam(req.params.planId);
  if (validationError) {
    sendError(res, 400, validationError);
    return null;
  }
  return String(req.params.planId);
}

export async function createTraineePlan(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseCreatePlanPayload(req.body);
  if (!value) {
    sendError(res, 400, error);
    return;
  }

  try {
    const plan = await createCoachPlan(req.traineeId!, req.coachingId!, req.userId!, value);
    res.status(201).json({ plan });
  } catch (createError) {
    sendPlanError(res, createError);
  }
}

export async function getTraineePlan(req: AuthenticatedRequest, res: Response) {
  const planId = readPlanId(req, res);
  if (!planId) return;

  try {
    res.status(200).json({ plan: await getCoachPlan(req.traineeId!, req.coachingId!, planId) });
  } catch (error) {
    sendPlanError(res, error);
  }
}

export async function saveTraineePlan(req: AuthenticatedRequest, res: Response) {
  const planId = readPlanId(req, res);
  if (!planId) return;

  const { value, issues } = parseSavePlanPayload(req.body);
  if (!value) {
    sendPlanIssues(res, issues);
    return;
  }

  try {
    res.status(200).json({ plan: await saveCoachPlan(req.traineeId!, req.coachingId!, planId, value) });
  } catch (error) {
    sendPlanError(res, error);
  }
}

export async function publishTraineePlan(req: AuthenticatedRequest, res: Response) {
  const planId = readPlanId(req, res);
  if (!planId) return;

  const note = parsePublishNotePayload(req.body);
  if (!note.value) {
    sendError(res, 400, note.error);
    return;
  }

  try {
    res.status(200).json({ plan: await publishCoachPlan(req.traineeId!, req.coachingId!, planId, note.value) });
  } catch (error) {
    sendPlanError(res, error);
  }
}

export async function unpublishTraineePlan(req: AuthenticatedRequest, res: Response) {
  const planId = readPlanId(req, res);
  if (!planId) return;

  try {
    res.status(200).json({ plan: await unpublishCoachPlan(req.traineeId!, req.coachingId!, planId) });
  } catch (error) {
    sendPlanError(res, error);
  }
}

export async function deleteTraineePlan(req: AuthenticatedRequest, res: Response) {
  const planId = readPlanId(req, res);
  if (!planId) return;

  try {
    await deleteCoachPlan(req.traineeId!, req.coachingId!, planId);
    res.status(204).end();
  } catch (error) {
    sendPlanError(res, error);
  }
}
