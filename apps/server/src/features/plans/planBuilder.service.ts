import { cardioLogRefs } from '../cardio/cardio.service';
import { markCoachingActive } from '../coachings/coaching.service';
import { CardioLog } from '../cardio/cardio.model';
import { Types } from 'mongoose';
import type { CoachPlan, CoachPlanProgress, PlanDuplicateSource } from '@sistem/types';
import { emitAppEvent } from '../../events/appEvents';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { findCoachLibraryIds } from '../exercises/exercise.service';
import { isLinkableRecommendation } from '../aiRecommendations/aiRecommendation.service';
import { Plan } from './plan.model';
import { PlanNotFoundError, attachExerciseFacts, fillPlanIntros, toPublicPlan } from './plan.service';
import type { LeanPlan } from './plan.service';
import { addDays, currentWeekStart, localDateString } from './planWeek';
import { resolveWorkoutStatus } from './planStatus';
import { checkTrainingIds, findPublishIssues } from './plan.validation';
import { getEffectiveTrainingConfig } from '../trainingSplits/trainingSplit.service';
import type { CreatePlanInput, PlanProblem, PublishNoteInput, SavePlanInput, UpdateBlockInput } from './plan.validation';
import { msg } from '../../i18n';
import { PlanConflictError, PlanValidationError, PlanWeekHasDraftError } from './planBuilder.errors';
import { copiedContent } from './planBlockCopy';
import { isEmptyDraft } from './planDraftContent';
import { blockInfoFor, blockOfPlan, blockWeeksOf, copyForward, createBlock, deleteBlock, publishBlock, unpublishBlock, updateBlock } from './planBlock.service';

// The coach's side of plans (PRD §6 plan builder). Every function takes the trainee
// id that loadCoachTrainee already checked, and scopes its queries by it — a plan id
// from another trainee is simply not found.

export { PlanBlockHasDraftsError, PlanConflictError, PlanValidationError, PlanWeekHasDraftError } from './planBuilder.errors';

const DUPLICATE_KEY_ERROR = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === DUPLICATE_KEY_ERROR;
}

async function toCoachPlans(plans: LeanPlan[]): Promise<CoachPlan[]> {
  // All of one trainee's plans: the coach reads the message as she does ({name} filled).
  const publicPlans = plans.length > 0 ? await fillPlanIntros(String(plans[0].traineeId), plans.map((plan) => toPublicPlan(plan))) : [];
  const [startedPlanIds, blocks] = await Promise.all([
    WorkoutLog.distinct('planId', { planId: { $in: plans.map((plan) => plan._id) } }),
    blockInfoFor(plans),
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
        const exercisesById = new Map(source?.exercises.map((exercise) => [String(exercise._id), exercise]) ?? []);
        return {
          ...workout,
          ...(source?.workoutType ? { workoutType: source.workoutType } : {}),
          ...(source?.hiddenSlotIds?.length ? { hiddenSlotIds: [...source.hiddenSlotIds] } : {}),
          exercises: workout.exercises.map((exercise) => {
            const { slotId, progression } = exercisesById.get(exercise.id) ?? {};
            return { ...exercise, ...(slotId ? { slotId } : {}), ...(progression ? { progression } : {}) };
          }),
        };
      }),
      locked: locked.has(plan.id),
      ...(blocks.has(plan.id) ? { block: blocks.get(plan.id) } : {}),
      ...(aiRecommendationId ? { aiRecommendationId: String(aiRecommendationId) } : {}),
      ...(splitId ? { splitId } : {}),
    };
  });
}

// Coach side: every plan is looked up inside ONE coaching (this coach ↔ this trainee) — never by trainee only.
async function findPlan(traineeId: string, coachingId: string, planId: string): Promise<LeanPlan> {
  const plan = await Plan.findOne({ _id: planId, traineeId, coachingId }).lean<LeanPlan>();
  if (!plan) {
    throw new PlanNotFoundError('plan_not_found');
  }
  return plan;
}

async function isHiddenBlockWeek(plan: { blockId?: unknown; traineeId: Types.ObjectId; weekStartDate: string }): Promise<boolean> {
  if (!plan.blockId) return false;
  const trainee = await User.findById(plan.traineeId).select('timezone').lean();
  return plan.weekStartDate > currentWeekStart(trainee?.timezone ?? DEFAULT_TIMEZONE);
}

async function isLocked(planId: string): Promise<boolean> {
  return (await WorkoutLog.exists({ planId })) !== null;
}

export async function listCoachPlans(traineeId: string, coachingId: string, now: Date = new Date()): Promise<CoachPlan[]> {
  const [plans, trainee] = await Promise.all([
    Plan.find({ traineeId, coachingId }).sort({ weekStartDate: -1 }).lean<LeanPlan[]>(),
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

/** One plan — with its block's weeks (the builder's ribbon) when it is a week of a multi-week plan. */
export async function getCoachPlan(traineeId: string, coachingId: string, planId: string): Promise<CoachPlan> {
  const stored = await findPlan(traineeId, coachingId, planId);
  const [[plan], blockWeeks] = await Promise.all([toCoachPlans([stored]), stored.blockId ? blockWeeksOf(stored.blockId) : null]);
  return blockWeeks ? { ...plan, blockWeeks } : plan;
}


/**
 * The plan a duplicate copies. Only PUBLISHED plans are copied: a draft may be empty or
 * half-built, and copying one led to an endless "duplicate → empty draft → duplicate" loop.
 * `sourcePlanId` = any published plan of this coach (another trainee, an ended week);
 * otherwise "duplicate last week" = the trainee's most recent earlier published plan.
 */
async function findDuplicateSource(coachingId: string, coachId: string, input: CreatePlanInput): Promise<LeanPlan | null> {
  if (input.sourcePlanId) {
    const source = await Plan.findOne({ _id: input.sourcePlanId, coachId, status: 'published' }).lean<LeanPlan>();
    if (!source) throw new PlanNotFoundError('plan_source_not_found');
    return source;
  }
  if (!input.duplicatePrevious) return null;
  const previous = await Plan.findOne({ coachingId, status: 'published', weekStartDate: { $lt: input.weekStartDate } })
    .sort({ weekStartDate: -1 })
    .lean<LeanPlan>();
  if (!previous) throw new PlanConflictError('plan_nothing_to_duplicate');
  return previous;
}

/**
 * A new draft for one week: empty, or a copy of a published plan. A week that already has a
 * draft (standalone, not locked):
 * - an EMPTY draft (planDraftContent.ts) is no conflict: it is replaced silently;
 * - a draft with content: 409 plan_week_has_draft (with its id), or — when the coach chose
 *   "replace" — its content is replaced in place (by the copy, or emptied for scratch / AI).
 * A published week, a week of a multi-week plan and a locked draft are never replaced.
 */
export async function createCoachPlan(traineeId: string, coachingId: string, coachId: string, input: CreatePlanInput): Promise<CoachPlan> {
  const trainee = await User.findById(traineeId).select('timezone').lean();
  if (!trainee) {
    throw new Error('Trainee disappeared after the ownership check.');
  }
  if (input.weekStartDate < currentWeekStart(trainee.timezone)) {
    throw new PlanConflictError('plan_week_too_early');
  }
  const source = await findDuplicateSource(coachingId, coachId, input);
  const content = source ? copiedContent(source) : { notes: undefined, splitId: undefined, workouts: [] };

  // A multi-week plan: week 1 = the copy (or empty), the later weeks empty; every week must be free.
  if (input.lengthWeeks > 1) {
    const firstPlanId = await createBlock(traineeId, coachingId, coachId, input, content);
    return getCoachPlan(traineeId, coachingId, firstPlanId);
  }

  const existing = await Plan.findOne({ coachingId, weekStartDate: input.weekStartDate });
  if (existing) {
    if (existing.status !== 'draft' || existing.blockId) throw new PlanConflictError('plan_week_taken');
    if (await isLocked(String(existing._id))) throw new PlanConflictError('plan_locked');
    if (!isEmptyDraft(existing) && !input.replaceDraft) throw new PlanWeekHasDraftError(String(existing._id));
    existing.set({ notes: content.notes, splitId: content.splitId, aiRecommendationId: undefined });
    existing.set('workouts', content.workouts);
    await existing.save();
    return getCoachPlan(traineeId, coachingId, String(existing._id));
  }

  try {
    const created = new Plan({ traineeId, coachId, coachingId, weekStartDate: input.weekStartDate, notes: content.notes, splitId: content.splitId });
    created.set('workouts', content.workouts);
    await created.save();
    return getCoachPlan(traineeId, coachingId, String(created._id));
  } catch (error) {
    // Two creates for the same week at once: the unique index decides.
    if (isDuplicateKeyError(error)) {
      throw new PlanConflictError('plan_week_taken');
    }
    throw error;
  }
}

const DUPLICATE_SOURCES_LIMIT = 40;

/**
 * The "duplicate from" list: every PUBLISHED plan of this coach (this trainee's and her other
 * trainees', past weeks and ended coachings included), newest week first. Drafts never appear.
 */
export async function listDuplicateSources(coachId: string): Promise<PlanDuplicateSource[]> {
  const plans = await Plan.find({ coachId, status: 'published' })
    .sort({ weekStartDate: -1, publishedAt: -1 })
    .limit(DUPLICATE_SOURCES_LIMIT)
    .select('traineeId weekStartDate workouts._id')
    .lean<{ _id: Types.ObjectId; traineeId: Types.ObjectId; weekStartDate: string; workouts: { _id: Types.ObjectId }[] }[]>();
  const trainees = await User.find({ _id: { $in: [...new Set(plans.map((plan) => String(plan.traineeId)))] } })
    .select('name')
    .lean<{ _id: Types.ObjectId; name?: string }[]>();
  const names = new Map(trainees.map((trainee) => [String(trainee._id), trainee.name ?? '']));
  return plans.map((plan) => ({
    id: String(plan._id),
    traineeId: String(plan.traineeId),
    traineeName: names.get(String(plan.traineeId)) ?? '',
    weekStartDate: plan.weekStartDate,
    workoutCount: plan.workouts.length,
  }));
}

/**
 * Replaces the plan's content. Workouts and exercises sent with the id they already
 * have keep it (workout logs point at those ids); everything else gets a new id.
 * A published plan is live for the trainee, so it must stay publishable.
 */
export async function saveCoachPlan(traineeId: string, coachingId: string, planId: string, input: SavePlanInput): Promise<CoachPlan> {
  const plan = await Plan.findOne({ _id: planId, traineeId, coachingId });
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
  if (input.aiRecommendationId && !(await isLinkableRecommendation(coachingId, input.aiRecommendationId))) {
    issues.push(msg('plan_ai_recommendation_missing'));
  }
  issues.push(...checkTrainingIds(input, await getEffectiveTrainingConfig(String(plan.coachId))));
  if (issues.length > 0) {
    throw new PlanValidationError(issues);
  }

  // A workout removed in an earlier save and put back ("Undo") keeps the id her logs point at, so
  // its history stays linked. Only this plan's own ids (in it now, or in its logs) are ever kept.
  const logFilter = { planId: plan._id, traineeId };
  const [loggedWorkoutIds, loggedExerciseIds, cardioWorkoutIds] = await Promise.all([
    WorkoutLog.distinct('workoutId', logFilter),
    WorkoutLog.distinct('sets.planExerciseId', logFilter),
    CardioLog.distinct('workoutId', logFilter),
  ]);
  const workoutIds = new Set([...plan.workouts.map((workout) => String(workout._id)), ...[...loggedWorkoutIds, ...cardioWorkoutIds].map(String)]);
  const planExerciseIds = new Set([
    ...plan.workouts.flatMap((workout) => workout.exercises.map((exercise) => String(exercise._id))),
    ...loggedExerciseIds.filter((id) => id != null).map(String),
  ]);
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
  // She sees a published plan, so its change lights the Workouts tab dot — not a later week of a
  // multi-week plan, which stays hidden from her until its Sunday.
  if (plan.status === 'published' && plan.isModified('workouts notes') && !(await isHiddenBlockWeek(plan))) plan.set('liveUpdatedAt', new Date());
  await plan.save();

  return getCoachPlan(traineeId, coachingId, planId);
}

/**
 * Makes a draft visible to the trainee and announces it ('plan.published' → her
 * notification). Publishing an already published plan changes nothing and
 * announces nothing. `note` = the message + tip sent with it (stored as sent; omitted keeps
 * what the plan holds).
 */
export async function publishCoachPlan(traineeId: string, coachingId: string, planId: string, note: PublishNoteInput = {}): Promise<CoachPlan> {
  const plan = await findPlan(traineeId, coachingId, planId);
  // A week of a multi-week plan: the whole block publishes together (one announcement).
  const block = await blockOfPlan(plan);
  if (block) {
    await publishBlock(block, note);
    return getCoachPlan(traineeId, coachingId, planId);
  }
  if (plan.status === 'published') {
    return getCoachPlan(traineeId, coachingId, planId);
  }

  const issues = findPublishIssues(plan.workouts);
  if (issues.length > 0) {
    throw new PlanValidationError(issues);
  }

  // The status in the filter makes two publishes at once emit a single event.
  const publishedAt = new Date();
  const published = await Plan.findOneAndUpdate(
    { _id: planId, traineeId, coachingId, status: 'draft' },
    { $set: { status: 'published', publishedAt, liveUpdatedAt: publishedAt, ...note } },
    { returnDocument: 'after' },
  ).lean<LeanPlan>();

  if (published) {
    // Her first published plan with this coach: the coaching leaves 'waiting'.
    await markCoachingActive(coachingId);
    emitAppEvent('plan.published', {
      planId,
      traineeId,
      coachId: String(published.coachId),
      weekStartDate: published.weekStartDate,
      publishedAt,
    });
  }
  return getCoachPlan(traineeId, coachingId, planId);
}


/**
 * Back to a draft — only while the trainee has not started any workout from it.
 * Her app state follows on its own: it is computed from her published plans.
 */
export async function unpublishCoachPlan(traineeId: string, coachingId: string, planId: string): Promise<CoachPlan> {
  const plan = await findPlan(traineeId, coachingId, planId);
  const block = await blockOfPlan(plan);
  if (block) {
    await unpublishBlock(block);
    return getCoachPlan(traineeId, coachingId, planId);
  }
  if (plan.status === 'published') {
    if (await isLocked(planId)) {
      throw new PlanConflictError('plan_locked');
    }
    await Plan.updateOne({ _id: planId, traineeId, coachingId }, { $set: { status: 'draft', publishedAt: null } });
  }
  return getCoachPlan(traineeId, coachingId, planId);
}

/** Drafts, and published plans the trainee has not started yet. */
export async function deleteCoachPlan(traineeId: string, coachingId: string, planId: string, options: { draftOnly?: boolean } = {}): Promise<void> {
  const plan = await findPlan(traineeId, coachingId, planId);
  // "מחיקת הטיוטה" (the new-plan popover, the builder's ⋯ on a draft): never a published plan.
  if (options.draftOnly && plan.status !== 'draft') throw new PlanConflictError('plan_not_draft');
  // A week of a multi-week plan: the whole block goes.
  const block = await blockOfPlan(plan);
  if (block) {
    await deleteBlock(block);
    return;
  }
  if (await isLocked(planId)) {
    throw new PlanConflictError('plan_locked');
  }
  await Plan.deleteOne({ _id: planId, traineeId, coachingId });
}

/** "העתקה לשבועות הבאים" — this week into the later weeks of its block. */
export async function copyCoachPlanForward(traineeId: string, coachingId: string, planId: string): Promise<{ plan: CoachPlan; copiedWeeks: number[] }> {
  const copiedWeeks = await copyForward(traineeId, coachingId, planId);
  return { plan: await getCoachPlan(traineeId, coachingId, planId), copiedWeeks };
}

/** A draft block's length / its "שבוע קל" switch. The plan answered may be week 1 (this week was removed). */
export async function updateCoachPlanBlock(traineeId: string, coachingId: string, planId: string, input: UpdateBlockInput): Promise<CoachPlan> {
  const shownPlanId = await updateBlock(traineeId, coachingId, planId, input);
  return getCoachPlan(traineeId, coachingId, shownPlanId);
}
