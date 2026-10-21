import { cardioLogRefs } from '../cardio/cardio.service';
import { Types } from 'mongoose';
import type { CoachPlan, CoachPlanProgress } from '@sistem/types';
import { emitAppEvent } from '../../events/appEvents';
import { User } from '../users/user.model';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { findCoachLibraryIds } from '../exercises/exercise.service';
import { isLinkableRecommendation } from '../aiRecommendations/aiRecommendation.service';
import { Plan } from './plan.model';
import { PlanNotFoundError, attachExerciseFacts, toPublicPlan } from './plan.service';
import type { LeanPlan } from './plan.service';
import { addDays, currentWeekStart, localDateString } from './planWeek';
import { resolveWorkoutStatus } from './planStatus';
import { checkTrainingIds, findPublishIssues } from './plan.validation';
import { getEffectiveTrainingConfig } from '../trainingSplits/trainingSplit.service';
import type { CreatePlanInput, PlanProblem, SavePlanInput } from './plan.validation';
import { LocalizedError, msg } from '../../i18n';

// The coach's side of plans (PRD §6 plan builder). Every function takes the trainee
// id that loadCoachTrainee already checked, and scopes its queries by it — a plan id
// from another trainee is simply not found.

/** The plan (or the request) breaks a plan rule; `issues` say where. */
export class PlanValidationError extends Error {
  constructor(public readonly issues: PlanProblem[]) {
    super(issues[0]?.code ?? 'plan_invalid');
  }
}

/** The action does not fit the plan's current state (week taken, plan locked, …). */
export class PlanConflictError extends LocalizedError {}

const DUPLICATE_KEY_ERROR = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === DUPLICATE_KEY_ERROR;
}

async function toCoachPlans(plans: LeanPlan[]): Promise<CoachPlan[]> {
  const publicPlans = plans.map(toPublicPlan);
  const [startedPlanIds] = await Promise.all([
    WorkoutLog.distinct('planId', { planId: { $in: plans.map((plan) => plan._id) } }),
    attachExerciseFacts(publicPlans),
  ]);
  const locked = new Set(startedPlanIds.map(String));

  return publicPlans.map((plan, index) => {
    const { aiRecommendationId, splitId, workouts } = plans[index];
    // Phase 12b slot data is coach-only, so it is added here and not in toPublicPlan.
    const stored = new Map(workouts.map((workout) => [String(workout._id), workout]));
    return {
      ...plan,
      workouts: plan.workouts.map((workout) => {
        const source = stored.get(workout.id);
        const slots = new Map(source?.exercises.map((exercise) => [String(exercise._id), exercise.slotId]) ?? []);
        return {
          ...workout,
          ...(source?.workoutType ? { workoutType: source.workoutType } : {}),
          exercises: workout.exercises.map((exercise) => {
            const slotId = slots.get(exercise.id);
            return slotId ? { ...exercise, slotId } : exercise;
          }),
        };
      }),
      locked: locked.has(plan.id),
      ...(aiRecommendationId ? { aiRecommendationId: String(aiRecommendationId) } : {}),
      ...(splitId ? { splitId } : {}),
    };
  });
}

async function findPlan(traineeId: string, planId: string): Promise<LeanPlan> {
  const plan = await Plan.findOne({ _id: planId, traineeId }).lean<LeanPlan>();
  if (!plan) {
    throw new PlanNotFoundError('plan_not_found');
  }
  return plan;
}

async function isLocked(planId: string): Promise<boolean> {
  return (await WorkoutLog.exists({ planId })) !== null;
}

export async function listCoachPlans(traineeId: string, now: Date = new Date()): Promise<CoachPlan[]> {
  const [plans, trainee] = await Promise.all([
    Plan.find({ traineeId }).sort({ weekStartDate: -1 }).lean<LeanPlan[]>(),
    User.findById(traineeId).select('timezone').lean<{ timezone: string }>(),
  ]);
  const coachPlans = await toCoachPlans(plans);
  if (!trainee) return coachPlans;

  // Each published plan's workouts judged by the same rule as her own app (planStatus), as of today in her zone.
  const today = localDateString(now, trainee.timezone);
  const published = coachPlans.filter((plan) => plan.status === 'published');
  const doneLogs = await WorkoutLog.find({ planId: { $in: published.map((plan) => plan.id) }, status: 'completed' })
    .select('planId workoutId')
    .lean<{ planId: Types.ObjectId; workoutId: Types.ObjectId }[]>();
  // A cardio workout is done by its cardio log.
  const cardioDone = await cardioLogRefs(traineeId, published.map((plan) => new Types.ObjectId(plan.id)));
  const done = new Set([
    ...doneLogs.map((log) => `${String(log.planId)}:${String(log.workoutId)}`),
    ...cardioDone.map((log) => `${log.planId}:${log.workoutId}`),
  ]);

  return coachPlans.map((plan) => {
    if (plan.status !== 'published') return plan;
    const statuses: CoachPlanProgress['statuses'] = {};
    for (const workout of plan.workouts) {
      const date = workout.dayOfWeek === undefined ? null : addDays(plan.weekStartDate, workout.dayOfWeek);
      statuses[workout.id] = resolveWorkoutStatus(date, plan.weekStartDate, today, done.has(`${plan.id}:${workout.id}`));
    }
    const values = Object.values(statuses);
    return { ...plan, progress: { statuses, completed: values.filter((status) => status === 'done').length, planned: values.length } };
  });
}

export async function getCoachPlan(traineeId: string, planId: string): Promise<CoachPlan> {
  const [plan] = await toCoachPlans([await findPlan(traineeId, planId)]);
  return plan;
}

/**
 * A new draft for one week: empty, or a copy of the trainee's most recent earlier
 * plan ("duplicate last week"). The copy gets fresh workout / exercise ids, so its
 * workout logs never mix with the original's.
 */
export async function createCoachPlan(traineeId: string, coachId: string, input: CreatePlanInput): Promise<CoachPlan> {
  const trainee = await User.findById(traineeId).select('timezone').lean();
  if (!trainee) {
    throw new Error('Trainee disappeared after the ownership check.');
  }
  if (input.weekStartDate < currentWeekStart(trainee.timezone)) {
    throw new PlanConflictError('plan_week_too_early');
  }
  if (await Plan.exists({ traineeId, weekStartDate: input.weekStartDate })) {
    throw new PlanConflictError('plan_week_taken');
  }

  let notes: string | undefined;
  let splitId: string | undefined;
  let workouts: unknown[] = [];
  if (input.duplicatePrevious) {
    const previous = await Plan.findOne({ traineeId, weekStartDate: { $lt: input.weekStartDate } })
      .sort({ weekStartDate: -1 })
      .lean<LeanPlan>();
    if (!previous) {
      throw new PlanConflictError('plan_nothing_to_duplicate');
    }
    notes = previous.notes;
    // Workout types and slots are copied with the workouts (coach structure); the AI link is not.
    splitId = previous.splitId ?? undefined;
    workouts = previous.workouts.map(({ _id: _workoutId, exercises, ...workout }) => ({
      ...workout,
      exercises: exercises.map(({ _id: _exerciseId, ...exercise }) => exercise),
    }));
  }

  try {
    const created = new Plan({ traineeId, coachId, weekStartDate: input.weekStartDate, notes, splitId });
    created.set('workouts', workouts);
    await created.save();
    return getCoachPlan(traineeId, String(created._id));
  } catch (error) {
    // Two creates for the same week at once: the unique index decides.
    if (isDuplicateKeyError(error)) {
      throw new PlanConflictError('plan_week_taken');
    }
    throw error;
  }
}

/**
 * Replaces the plan's content. Workouts and exercises sent with the id they already
 * have keep it (workout logs point at those ids); everything else gets a new id.
 * A published plan is live for the trainee, so it must stay publishable.
 */
export async function saveCoachPlan(traineeId: string, planId: string, input: SavePlanInput): Promise<CoachPlan> {
  const plan = await Plan.findOne({ _id: planId, traineeId });
  if (!plan) {
    throw new PlanNotFoundError('plan_not_found');
  }

  const issues: PlanProblem[] = plan.status === 'published' ? findPublishIssues(input.workouts) : [];

  const existingExerciseIds = new Set<string>();
  for (const workout of plan.workouts) {
    for (const exercise of workout.exercises) existingExerciseIds.add(String(exercise.exerciseId));
  }
  // Only newly added exercises must be in the library; ones already in the plan stay.
  const newExerciseIds = new Set<string>();
  for (const workout of input.workouts) {
    for (const exercise of workout.exercises) {
      if (!existingExerciseIds.has(exercise.exerciseId)) newExerciseIds.add(exercise.exerciseId);
    }
  }
  const allowed = await findCoachLibraryIds([...newExerciseIds]);
  input.workouts.forEach((workout, workoutIndex) => {
    workout.exercises.forEach((exercise, exerciseIndex) => {
      if (newExerciseIds.has(exercise.exerciseId) && !allowed.has(exercise.exerciseId)) {
        issues.push({ ...msg('plan_exercise_not_in_library'), workoutIndex, exerciseIndex });
      }
    });
  });
  if (input.aiRecommendationId && !(await isLinkableRecommendation(traineeId, input.aiRecommendationId))) {
    issues.push(msg('plan_ai_recommendation_missing'));
  }
  issues.push(...checkTrainingIds(input, await getEffectiveTrainingConfig(String(plan.coachId))));
  if (issues.length > 0) {
    throw new PlanValidationError(issues);
  }

  const workoutIds = new Set(plan.workouts.map((workout) => String(workout._id)));
  const planExerciseIds = new Set(plan.workouts.flatMap((workout) => workout.exercises.map((exercise) => String(exercise._id))));
  const used = new Set<string>();
  const keepOrCreateId = (id: string | undefined, existing: Set<string>): Types.ObjectId => {
    if (id && existing.has(id) && !used.has(id)) {
      used.add(id);
      return new Types.ObjectId(id);
    }
    return new Types.ObjectId();
  };

  plan.set(
    'workouts',
    input.workouts.map(({ id: workoutId, exercises, ...workout }, order) => ({
      ...workout,
      _id: keepOrCreateId(workoutId, workoutIds),
      order,
      exercises: exercises.map(({ id: exerciseId, ...exercise }) => ({
        ...exercise,
        _id: keepOrCreateId(exerciseId, planExerciseIds),
      })),
    })),
  );
  plan.set('notes', input.notes);
  if (input.aiRecommendationId !== undefined) plan.set('aiRecommendationId', input.aiRecommendationId ?? undefined);
  if (input.splitId !== undefined) plan.set('splitId', input.splitId ?? undefined);
  // She sees a published plan, so its change lights the Workouts tab dot.
  if (plan.status === 'published' && plan.isModified('workouts notes')) plan.set('liveUpdatedAt', new Date());
  await plan.save();

  return getCoachPlan(traineeId, planId);
}

/**
 * Makes a draft visible to the trainee and announces it ('plan.published' → her
 * notification). Publishing an already published plan changes nothing and
 * announces nothing.
 */
export async function publishCoachPlan(traineeId: string, planId: string): Promise<CoachPlan> {
  const plan = await findPlan(traineeId, planId);
  if (plan.status === 'published') {
    return getCoachPlan(traineeId, planId);
  }

  const issues = findPublishIssues(plan.workouts);
  if (issues.length > 0) {
    throw new PlanValidationError(issues);
  }

  // The status in the filter makes two publishes at once emit a single event.
  const publishedAt = new Date();
  const published = await Plan.findOneAndUpdate(
    { _id: planId, traineeId, status: 'draft' },
    { $set: { status: 'published', publishedAt, liveUpdatedAt: publishedAt } },
    { returnDocument: 'after' },
  ).lean<LeanPlan>();

  if (published) {
    emitAppEvent('plan.published', {
      planId,
      traineeId,
      coachId: String(published.coachId),
      weekStartDate: published.weekStartDate,
      publishedAt,
    });
  }
  return getCoachPlan(traineeId, planId);
}


/**
 * Back to a draft — only while the trainee has not started any workout from it.
 * Her app state follows on its own: it is computed from her published plans.
 */
export async function unpublishCoachPlan(traineeId: string, planId: string): Promise<CoachPlan> {
  const plan = await findPlan(traineeId, planId);
  if (plan.status === 'published') {
    if (await isLocked(planId)) {
      throw new PlanConflictError('plan_locked');
    }
    await Plan.updateOne({ _id: planId, traineeId }, { $set: { status: 'draft', publishedAt: null } });
  }
  return getCoachPlan(traineeId, planId);
}

/** Drafts, and published plans the trainee has not started yet. */
export async function deleteCoachPlan(traineeId: string, planId: string): Promise<void> {
  await findPlan(traineeId, planId);
  if (await isLocked(planId)) {
    throw new PlanConflictError('plan_locked');
  }
  await Plan.deleteOne({ _id: planId, traineeId });
}
