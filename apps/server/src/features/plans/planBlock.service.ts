import { Types } from 'mongoose';
import type { PlanBlockInfo, PlanBlockWeek } from '@sistem/types';
import { emitAppEvent } from '../../events/appEvents';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { markCoachingActive } from '../coachings/coaching.service';
import { Plan } from './plan.model';
import { PlanBlock } from './planBlock.model';
import type { PlanBlockDocument } from './planBlock.model';
import type { LeanPlan } from './plan.service';
import { PlanNotFoundError } from './plan.service';
import { addDays, currentWeekStart } from './planWeek';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { findPublishIssues } from './plan.validation';
import type { PlanProblem, PublishNoteInput, UpdateBlockInput } from './plan.validation';
import { PlanConflictError, PlanValidationError } from './planBuilder.errors';
import { copiedContent, copyStepsFor, progressWorkouts, weekVolume } from './planBlockCopy';
import type { CopiedWorkout } from './planBlockCopy';

// Multi-week plans ("חודשית", 2026-11-09). A block = N ordinary weekly Plans (blockId + blockWeek)
// that are published, unpublished and deleted together. Every function is scoped by the trainee +
// coaching that loadCoachTrainee checked, like planBuilder.service.

type LeanBlock = PlanBlockDocument & { _id: Types.ObjectId };

const WEEK_DAYS = 7;
const DUPLICATE_KEY_ERROR = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === DUPLICATE_KEY_ERROR;
}

export function blockWeekStart(startWeek: string, week: number): string {
  return addDays(startWeek, (week - 1) * WEEK_DAYS);
}

async function lockedPlanIds(planIds: Types.ObjectId[]): Promise<Set<string>> {
  if (planIds.length === 0) return new Set();
  return new Set((await WorkoutLog.distinct('planId', { planId: { $in: planIds } })).map(String));
}

/** The first week (1-based) of weeks `from..to` that already has a plan of this coaching, or null. */
async function firstTakenWeek(coachingId: string, startWeek: string, from: number, to: number): Promise<number | null> {
  const dates = Array.from({ length: to - from + 1 }, (_, index) => blockWeekStart(startWeek, from + index));
  const taken = new Set((await Plan.find({ coachingId, weekStartDate: { $in: dates } }).select('weekStartDate').lean()).map((plan) => plan.weekStartDate));
  const index = dates.findIndex((date) => taken.has(date));
  return index === -1 ? null : from + index;
}

async function insertEmptyWeeks(block: LeanBlock, from: number, to: number): Promise<void> {
  const created: Types.ObjectId[] = [];
  try {
    for (let week = from; week <= to; week += 1) {
      const plan = await Plan.create({
        traineeId: block.traineeId,
        coachId: block.coachId,
        coachingId: block.coachingId,
        weekStartDate: blockWeekStart(block.startWeek, week),
        blockId: block._id,
        blockWeek: week,
        workouts: [],
      });
      created.push(plan._id);
    }
  } catch (error) {
    // A week was taken meanwhile (the unique index decides): nothing half-made stays behind.
    await Plan.deleteMany({ _id: { $in: created } });
    if (isDuplicateKeyError(error)) throw new PlanConflictError('plan_block_week_taken', { n: from + created.length });
    throw error;
  }
}

interface BlockContent {
  notes?: string;
  splitId?: string;
  workouts: CopiedWorkout[];
}

/**
 * A new multi-week plan: week 1 holds `content` (empty, a copy, …), the other weeks start empty
 * ("העתקה לשבועות הבאים" fills them). Every week must be free. Returns week 1's plan id.
 */
export async function createBlock(
  traineeId: string,
  coachingId: string,
  coachId: string,
  input: { weekStartDate: string; lengthWeeks: number; deloadLastWeek: boolean },
  content: BlockContent,
): Promise<string> {
  const taken = await firstTakenWeek(coachingId, input.weekStartDate, 1, input.lengthWeeks);
  if (taken !== null) throw new PlanConflictError('plan_block_week_taken', { n: taken });

  const block = await PlanBlock.create({
    coachingId,
    traineeId,
    coachId,
    startWeek: input.weekStartDate,
    lengthWeeks: input.lengthWeeks,
    deloadLastWeek: input.deloadLastWeek,
  });
  try {
    const first = new Plan({
      traineeId,
      coachId,
      coachingId,
      weekStartDate: input.weekStartDate,
      notes: content.notes,
      splitId: content.splitId,
      blockId: block._id,
      blockWeek: 1,
    });
    first.set('workouts', content.workouts);
    await first.save();
    try {
      await insertEmptyWeeks(block.toObject() as LeanBlock, 2, input.lengthWeeks);
    } catch (error) {
      await Plan.deleteOne({ _id: first._id });
      throw error;
    }
    return String(first._id);
  } catch (error) {
    await PlanBlock.deleteOne({ _id: block._id });
    if (isDuplicateKeyError(error)) throw new PlanConflictError('plan_block_week_taken', { n: 1 });
    throw error;
  }
}

function toInfo(block: LeanBlock, week: number): PlanBlockInfo {
  return {
    id: String(block._id),
    week,
    lengthWeeks: block.lengthWeeks,
    startWeek: block.startWeek,
    status: block.status,
    deloadLastWeek: block.deloadLastWeek,
  };
}

/** The block of each plan that has one (one query for a list). */
export async function blockInfoFor(plans: Pick<LeanPlan, '_id' | 'blockId' | 'blockWeek'>[]): Promise<Map<string, PlanBlockInfo>> {
  const ids = [...new Set(plans.flatMap((plan) => (plan.blockId ? [String(plan.blockId)] : [])))];
  if (ids.length === 0) return new Map();
  const blocks = new Map((await PlanBlock.find({ _id: { $in: ids } }).lean<LeanBlock[]>()).map((block) => [String(block._id), block]));
  const info = new Map<string, PlanBlockInfo>();
  for (const plan of plans) {
    const block = plan.blockId ? blocks.get(String(plan.blockId)) : undefined;
    if (block && plan.blockWeek) info.set(String(plan._id), toInfo(block, plan.blockWeek));
  }
  return info;
}

/** Every week of a block, in order — the builder's ribbon (dates, volume, status). */
export async function blockWeeksOf(blockId: Types.ObjectId | string): Promise<PlanBlockWeek[]> {
  const [block, plans] = await Promise.all([
    PlanBlock.findById(blockId).lean<LeanBlock>(),
    Plan.find({ blockId }).sort({ blockWeek: 1 }).select('weekStartDate status workouts blockWeek').lean<LeanPlan[]>(),
  ]);
  if (!block) return [];
  const locked = await lockedPlanIds(plans.map((plan) => plan._id));
  return plans.map((plan) => ({
    planId: String(plan._id),
    week: plan.blockWeek ?? 0,
    weekStartDate: plan.weekStartDate,
    status: plan.status,
    workoutCount: plan.workouts.length,
    volume: weekVolume(plan.workouts),
    locked: locked.has(String(plan._id)),
    isDeload: block.deloadLastWeek && plan.blockWeek === block.lengthWeeks,
  }));
}

async function findBlockPlan(traineeId: string, coachingId: string, planId: string): Promise<{ plan: LeanPlan; block: LeanBlock }> {
  const plan = await Plan.findOne({ _id: planId, traineeId, coachingId }).lean<LeanPlan>();
  if (!plan) throw new PlanNotFoundError('plan_not_found');
  const block = plan.blockId ? await PlanBlock.findOne({ _id: plan.blockId, coachingId }).lean<LeanBlock>() : null;
  if (!block || !plan.blockWeek) throw new PlanConflictError('plan_not_in_block');
  return { plan, block };
}

/**
 * "העתקה לשבועות הבאים": this week's content into every later week of its block, each with its
 * exercises' progression added once per week, and the last week cut to a "שבוע קל" when that is on.
 * Fresh workout / exercise ids per week. A later week she already started is never overwritten.
 */
export async function copyForward(traineeId: string, coachingId: string, planId: string): Promise<number[]> {
  const { plan, block } = await findBlockPlan(traineeId, coachingId, planId);
  const sourceWeek = plan.blockWeek!;
  const targets = await Plan.find({ blockId: block._id, coachingId, blockWeek: { $gt: sourceWeek } }).sort({ blockWeek: 1 });
  if (targets.length === 0) throw new PlanConflictError('plan_block_nothing_after');
  const locked = await lockedPlanIds(targets.map((target) => target._id));
  if (locked.size > 0) throw new PlanConflictError('plan_locked');

  const content = copiedContent(plan);
  const now = new Date();
  // Her Workouts tab dot: only for a week she can already see (later weeks are hidden).
  const trainee = await User.findById(traineeId).select('timezone').lean();
  const thisWeek = currentWeekStart(trainee?.timezone ?? DEFAULT_TIMEZONE, now);
  for (const target of targets) {
    const { steps, deload } = copyStepsFor(sourceWeek, target.blockWeek ?? 0, block.lengthWeeks, block.deloadLastWeek);
    target.set({ notes: content.notes, splitId: content.splitId, aiRecommendationId: undefined });
    target.set('workouts', progressWorkouts(content.workouts, steps, deload));
    if (target.status === 'published' && target.weekStartDate <= thisWeek) target.set('liveUpdatedAt', now);
    await target.save();
  }
  return targets.map((target) => target.blockWeek ?? 0);
}

/**
 * A draft block's length (longer = empty weeks added, all free; shorter = the last weeks removed,
 * never one she started) and the "שבוע קל" switch. Returns the plan to show (the same one, or
 * week 1 when this week was removed).
 */
export async function updateBlock(traineeId: string, coachingId: string, planId: string, input: UpdateBlockInput): Promise<string> {
  const { plan, block } = await findBlockPlan(traineeId, coachingId, planId);
  const length = input.lengthWeeks ?? block.lengthWeeks;
  if (length !== block.lengthWeeks) {
    if (block.status !== 'draft') throw new PlanConflictError('plan_block_published');
    if (length > block.lengthWeeks) {
      const taken = await firstTakenWeek(coachingId, block.startWeek, block.lengthWeeks + 1, length);
      if (taken !== null) throw new PlanConflictError('plan_block_week_taken', { n: taken });
      await insertEmptyWeeks(block, block.lengthWeeks + 1, length);
    } else {
      const removed = await Plan.find({ blockId: block._id, coachingId, blockWeek: { $gt: length } }).select('_id').lean();
      if ((await lockedPlanIds(removed.map((entry) => entry._id))).size > 0) throw new PlanConflictError('plan_locked');
      await Plan.deleteMany({ _id: { $in: removed.map((entry) => entry._id) } });
    }
  }
  await PlanBlock.updateOne(
    { _id: block._id },
    { $set: { lengthWeeks: length, ...(input.deloadLastWeek !== undefined ? { deloadLastWeek: input.deloadLastWeek } : {}) } },
  );
  if (plan.blockWeek! <= length) return planId;
  const first = await Plan.findOne({ blockId: block._id, blockWeek: 1 }).select('_id').lean();
  return String(first?._id ?? planId);
}

/**
 * One publish for the whole block: every week must be publishable (issues carry their week), then
 * all weeks go live together and ONE 'plan.published' is announced (week 1). The note goes with
 * week 1 only, so she reads it once. Publishing twice changes nothing and announces nothing.
 */
export async function publishBlock(block: LeanBlock, note: PublishNoteInput): Promise<void> {
  const plans = await Plan.find({ blockId: block._id, coachingId: block.coachingId }).sort({ blockWeek: 1 }).lean<LeanPlan[]>();
  if (plans.every((plan) => plan.status === 'published')) return;

  const issues: PlanProblem[] = plans.flatMap((plan) => findPublishIssues(plan.workouts).map((issue) => ({ ...issue, blockWeek: plan.blockWeek ?? undefined })));
  if (issues.length > 0) throw new PlanValidationError(issues);

  const publishedAt = new Date();
  const [first] = plans;
  const published = { status: 'published', publishedAt, liveUpdatedAt: publishedAt };
  // The status in the filter: two publishes at once announce once.
  const firstResult = await Plan.updateOne({ _id: first._id, status: 'draft' }, { $set: { ...published, ...note } });
  const rest = await Plan.updateMany({ blockId: block._id, _id: { $ne: first._id }, status: 'draft' }, { $set: published });
  await PlanBlock.updateOne({ _id: block._id }, { $set: { status: 'published' } });

  if (firstResult.modifiedCount + rest.modifiedCount > 0) {
    await markCoachingActive(String(block.coachingId));
    emitAppEvent('plan.published', {
      planId: String(first._id),
      traineeId: String(block.traineeId),
      coachId: String(block.coachId),
      weekStartDate: first.weekStartDate,
      publishedAt,
    });
  }
}

/** All weeks back to drafts — only while she has not started any of them. */
export async function unpublishBlock(block: LeanBlock): Promise<void> {
  const plans = await Plan.find({ blockId: block._id, coachingId: block.coachingId }).select('_id').lean();
  if ((await lockedPlanIds(plans.map((plan) => plan._id))).size > 0) throw new PlanConflictError('plan_locked');
  await Plan.updateMany({ blockId: block._id, status: 'published' }, { $set: { status: 'draft', publishedAt: null } });
  await PlanBlock.updateOne({ _id: block._id }, { $set: { status: 'draft', endingNotifiedAt: null } });
}

/** The whole block — only while she has not started any of its weeks. */
export async function deleteBlock(block: LeanBlock): Promise<void> {
  const plans = await Plan.find({ blockId: block._id, coachingId: block.coachingId }).select('_id').lean();
  if ((await lockedPlanIds(plans.map((plan) => plan._id))).size > 0) throw new PlanConflictError('plan_locked');
  await Plan.deleteMany({ blockId: block._id, coachingId: block.coachingId });
  await PlanBlock.deleteOne({ _id: block._id });
}

/** The block a plan belongs to (scoped to its coaching), or null for a weekly plan. */
export async function blockOfPlan(plan: Pick<LeanPlan, 'blockId' | 'coachingId'>): Promise<LeanBlock | null> {
  if (!plan.blockId) return null;
  return PlanBlock.findOne({ _id: plan.blockId, coachingId: plan.coachingId }).lean<LeanBlock>();
}
