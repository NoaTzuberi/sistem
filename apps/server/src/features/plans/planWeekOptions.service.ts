import type { PlanWeekOption, PlanWeekOptions, PlanWeekRelation } from '@sistem/types';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { Plan } from './plan.model';
import { isEmptyDraft } from './planDraftContent';
import { addDays, currentWeekStart } from './planWeek';

// The week picker of the coach's "New plan" / "Duplicate last week" (dashboard).
// The server decides the weeks and the defaults, in the trainee's time zone, so the
// picker never guesses a week. It never moves on to another week by itself: a week
// that already has a plan is shown with that plan, to open.

/** This week, next week and the six after them. Past weeks are never offered. */
export const PLAN_WEEKS_OFFERED = 8;
const WEEK_DAYS = 7;

function relationOf(index: number): PlanWeekRelation {
  if (index === 0) return 'this';
  return index === 1 ? 'next' : 'later';
}

export async function listPlanWeekOptions(traineeId: string, coachingId: string, now: Date = new Date()): Promise<PlanWeekOptions> {
  const trainee = await User.findById(traineeId).select('timezone').lean();
  const thisWeek = currentWeekStart(trainee?.timezone ?? DEFAULT_TIMEZONE, now);
  const lastWeek = addDays(thisWeek, (PLAN_WEEKS_OFFERED - 1) * WEEK_DAYS);

  // Every plan up to the last offered week: the offered ones, and the earlier ones a
  // duplicate would copy from (same rule as createCoachPlan: the most recent earlier published plan).
  const plans = await Plan.find({ coachingId, weekStartDate: { $lte: lastWeek } })
    .select('weekStartDate status blockId updatedAt workouts.kind workouts.exercises._id')
    .sort({ weekStartDate: -1 })
    .lean();
  const offeredIds = plans.filter((plan) => plan.weekStartDate >= thisWeek).map((plan) => plan._id);
  const locked = new Set((offeredIds.length > 0 ? await WorkoutLog.distinct('planId', { planId: { $in: offeredIds } }) : []).map(String));

  const weeks = Array.from({ length: PLAN_WEEKS_OFFERED }, (_, index): PlanWeekOption => {
    const weekStartDate = addDays(thisWeek, index * WEEK_DAYS);
    const plan = plans.find((candidate) => candidate.weekStartDate === weekStartDate);
    // Only a published plan is copied (a draft may be empty: copying it looped).
    const earlier = plans.find((candidate) => candidate.status === 'published' && candidate.weekStartDate < weekStartDate);
    return {
      weekStartDate,
      relation: relationOf(index),
      plan: plan
        ? {
            id: String(plan._id),
            status: plan.status,
            workoutCount: plan.workouts.length,
            isEmpty: isEmptyDraft(plan) && !locked.has(String(plan._id)),
            inBlock: Boolean(plan.blockId),
            locked: locked.has(String(plan._id)),
            // "נערכה לאחרונה" on the draft card (Mongoose timestamps; autosave bumps it).
            updatedAt: plan.updatedAt.toISOString(),
          }
        : null,
      copiesFromWeek: earlier?.weekStartDate ?? null,
    };
  });

  const [current, next] = weeks;
  return {
    currentWeekStart: thisWeek,
    weeks,
    defaultNewWeek: current.weekStartDate,
    defaultDuplicateWeek: current.plan ? next.weekStartDate : current.weekStartDate,
  };
}
