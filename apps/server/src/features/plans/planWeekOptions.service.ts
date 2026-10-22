import type { PlanWeekOption, PlanWeekOptions, PlanWeekRelation } from '@sistem/types';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { Plan } from './plan.model';
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
  // duplicate would copy from (same rule as createCoachPlan: the most recent earlier plan).
  const plans = await Plan.find({ coachingId, weekStartDate: { $lte: lastWeek } })
    .select('weekStartDate status')
    .sort({ weekStartDate: -1 })
    .lean();

  const weeks = Array.from({ length: PLAN_WEEKS_OFFERED }, (_, index): PlanWeekOption => {
    const weekStartDate = addDays(thisWeek, index * WEEK_DAYS);
    const plan = plans.find((candidate) => candidate.weekStartDate === weekStartDate);
    const earlier = plans.find((candidate) => candidate.weekStartDate < weekStartDate);
    return {
      weekStartDate,
      relation: relationOf(index),
      plan: plan ? { id: String(plan._id), status: plan.status } : null,
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
