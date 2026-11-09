import type { Types } from 'mongoose';
import type { Plan as PublicPlan, TraineeLockedWeek, TraineePlan, TraineePlanBlock, TraineePlanList, TraineeWeek } from '@sistem/types';
import { PlanBlock } from './planBlock.model';
import type { PlanBlockDocument } from './planBlock.model';
import { countWeightIncreases } from './planBlockCopy';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { cardioLogRefs } from '../cardio/cardio.service';
import { Plan } from './plan.model';
import { PlanNotFoundError, attachExerciseFacts, fillPlanIntros, toPublicPlan } from './plan.service';
import type { LeanPlan } from './plan.service';
import { pickNextWorkoutId, toTraineePlan } from './planStatus';
import type { WorkoutLogRef } from './planStatus';
import { addDays, localDateString, weekStartOf } from './planWeek';
import { coachingIdsOf, findOwnCoaching, getCurrentCoaching } from '../coachings/coaching.service';
import { getCoachName } from '../coachProfiles/coachProfile.service';

// The trainee's own side of plans (PRD §5.1, §5.4): published plans only, each
// workout with its status. Every query is scoped by the caller's id.

/** Today's calendar date where the trainee lives — never the server's or the device's. */
export async function todayFor(traineeId: string, now: Date): Promise<string> {
  const user = await User.findById(traineeId).select('timezone').lean();
  return localDateString(now, user?.timezone ?? DEFAULT_TIMEZONE);
}

type LeanBlock = PlanBlockDocument & { _id: Types.ObjectId };

async function blocksOf(plans: Pick<LeanPlan, 'blockId'>[]): Promise<Map<string, LeanBlock>> {
  const ids = [...new Set(plans.flatMap((plan) => (plan.blockId ? [String(plan.blockId)] : [])))];
  if (ids.length === 0) return new Map();
  return new Map((await PlanBlock.find({ _id: { $in: ids } }).lean<LeanBlock[]>()).map((block) => [String(block._id), block]));
}

/** "שבוע 2 מתוך 4" + how many exercises got heavier than the week before (her Workouts stage). */
async function blockViews(plans: LeanPlan[]): Promise<Map<string, TraineePlanBlock>> {
  const inBlocks = plans.filter((plan) => plan.blockId && plan.blockWeek);
  if (inBlocks.length === 0) return new Map();
  // Each week's previous week (week 1 has none).
  const wanted = inBlocks.filter((plan) => plan.blockWeek! > 1).map((plan) => ({ blockId: plan.blockId, blockWeek: plan.blockWeek! - 1 }));
  const [blocks, previous] = await Promise.all([
    blocksOf(inBlocks),
    wanted.length > 0 ? Plan.find({ $or: wanted }).select('blockId blockWeek workouts').lean<LeanPlan[]>() : Promise.resolve([] as LeanPlan[]),
  ]);
  const views = new Map<string, TraineePlanBlock>();
  for (const plan of inBlocks) {
    const block = blocks.get(String(plan.blockId));
    if (!block) continue;
    const before = previous.find((row) => String(row.blockId) === String(plan.blockId) && row.blockWeek === plan.blockWeek! - 1);
    views.set(String(plan._id), {
      week: plan.blockWeek!,
      lengthWeeks: block.lengthWeeks,
      isDeload: block.deloadLastWeek && plan.blockWeek === block.lengthWeeks,
      weightIncreases: before ? countWeightIncreases(sortedWorkouts(before), sortedWorkouts(plan)) : 0,
    });
  }
  return views;
}

function sortedWorkouts(plan: LeanPlan) {
  return [...plan.workouts].sort((a, b) => a.order - b.order);
}

async function toTraineePlans(traineeId: string, plans: LeanPlan[], today: string): Promise<TraineePlan[]> {
  const publicPlans: PublicPlan[] = await fillPlanIntros(traineeId, plans.map((plan) => toPublicPlan(plan)));
  const [logs, cardioLogs, , blocks] = await Promise.all([
    WorkoutLog.find({ traineeId, planId: { $in: plans.map((plan) => plan._id) } })
      .sort({ startedAt: -1 })
      .select('planId workoutId status')
      .lean(),
    // A cardio workout is done by its cardio log (its logId then points at that log).
    cardioLogRefs(traineeId, plans.map((plan) => plan._id)),
    attachExerciseFacts(publicPlans),
    blockViews(plans),
  ]);

  const logRefs: WorkoutLogRef[] = [
    ...logs.map((log) => ({
      id: String(log._id),
      planId: String(log.planId),
      workoutId: String(log.workoutId),
      status: log.status,
    })),
    ...cardioLogs,
  ];
  return publicPlans.map((plan) => {
    const traineePlan = toTraineePlan(plan, logRefs, today);
    const block = blocks.get(plan.id);
    return block ? { ...traineePlan, block } : traineePlan;
  });
}

/** A later week of a multi-week plan: hidden from her until its Sunday (her zone). */
function isLockedBlockWeek(plan: Pick<LeanPlan, 'blockId' | 'weekStartDate'>, thisWeek: string): boolean {
  return Boolean(plan.blockId) && plan.weekStartDate > thisWeek;
}

/**
 * Her published plans. With a coachingId: that coaching only. Without: every plan of a live
 * coaching, plus past weeks of ended ones (her history stays; an ended coach's future weeks don't show).
 */
export async function listTraineePlans(traineeId: string, now: Date = new Date(), coachingId: string | null = null): Promise<TraineePlanList> {
  const [today, liveIds] = await Promise.all([todayFor(traineeId, now), coachingIdsOf(traineeId)]);
  const scope = coachingId
    ? { coachingId }
    : { $or: [{ coachingId: { $in: liveIds } }, { weekStartDate: { $lt: weekStartOf(today) } }] };
  const plans = await Plan.find({ traineeId, status: 'published', ...scope }).sort({ weekStartDate: -1 }).lean<LeanPlan[]>();
  const thisWeek = weekStartOf(today);
  const locked = plans.filter((plan) => isLockedBlockWeek(plan, thisWeek));
  const blocks = await blocksOf(locked);
  const lockedWeeks: TraineeLockedWeek[] = locked
    .flatMap((plan) => {
      const block = blocks.get(String(plan.blockId));
      if (!block || !plan.blockWeek) return [];
      return [{
        weekStartDate: plan.weekStartDate,
        week: plan.blockWeek,
        lengthWeeks: block.lengthWeeks,
        workoutCount: plan.workouts.length,
        isDeload: block.deloadLastWeek && plan.blockWeek === block.lengthWeeks,
      }];
    })
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  return {
    items: await toTraineePlans(traineeId, plans.filter((plan) => !isLockedBlockWeek(plan, thisWeek)), today),
    today,
    nextWeekStartDate: addDays(thisWeek, 7),
    lockedWeeks,
    serverTime: now.toISOString(),
  };
}

/** Someone else's plan or a draft looks the same: not found. */
export async function getTraineePlan(planId: string, traineeId: string, now: Date = new Date()): Promise<TraineePlan> {
  const [today, plan] = await Promise.all([
    todayFor(traineeId, now),
    Plan.findOne({ _id: planId, traineeId, status: 'published' }).lean<LeanPlan>(),
  ]);
  // A later week of a multi-week plan stays hidden until its week starts.
  if (!plan || isLockedBlockWeek(plan, weekStartOf(today))) {
    throw new PlanNotFoundError('plan_not_found');
  }
  const [traineePlan] = await toTraineePlans(traineeId, [plan], today);
  return traineePlan;
}

/** This week's published plan (if any) and the workout to start next. */
/**
 * This week's published plan (if any) and the workout to start next — for one coaching: the one
 * asked for, else her current coaching (the single-coach app).
 */
export async function getTraineeWeek(traineeId: string, now: Date = new Date(), coachingId: string | null = null): Promise<TraineeWeek> {
  const [user, coaching] = await Promise.all([
    User.findById(traineeId).select('timezone').lean(),
    coachingId ? findOwnCoaching(traineeId, coachingId) : getCurrentCoaching(traineeId),
  ]);
  const today = localDateString(now, user?.timezone ?? DEFAULT_TIMEZONE);
  const weekStartDate = weekStartOf(today);
  const [plan, active, coachName] = await Promise.all([
    coaching ? Plan.findOne({ traineeId, coachingId: coaching._id, weekStartDate, status: 'published' }).lean<LeanPlan>() : null,
    WorkoutLog.findOne({ traineeId, status: 'in_progress' }).select('source planId workoutId workoutTitle startedAt').lean(),
    // Her coach's name only (Home's coach card: name + initials) — nothing else about the coach.
    coaching ? getCoachName(coaching.coachId) : null,
  ]);
  const [traineePlan = null] = plan ? await toTraineePlans(traineeId, [plan], today) : [];

  return {
    weekStartDate,
    today,
    serverTime: now.toISOString(),
    plan: traineePlan,
    nextWorkoutId: traineePlan ? pickNextWorkoutId(traineePlan) : null,
    coach: coachName ? { name: coachName } : null,
    activeLog: active
      ? {
          logId: String(active._id),
          source: active.source ?? 'plan',
          planId: active.planId ? String(active.planId) : null,
          workoutId: active.workoutId ? String(active.workoutId) : null,
          workoutTitle: active.workoutTitle,
          startedAt: active.startedAt.toISOString(),
        }
      : null,
  };
}
