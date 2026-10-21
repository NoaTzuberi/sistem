import type { Plan, PlanPeriod, TraineePlan, TraineePlanWorkout, WorkoutLogStatus, WorkoutStatus } from '@sistem/types';
import { addDays } from './planWeek';

/**
 * Workout status for the trainee's Home and Workouts screens (PRD §5.1, §5.4).
 * Pure functions over 'YYYY-MM-DD' dates: the caller passes `today` as the calendar
 * date in the trainee's time zone, so nothing here depends on the server's own zone.
 * Date strings in this format compare correctly as plain strings.
 */

const LAST_DAY_OFFSET = 6;

/** The part of a workout log the status needs. */
export interface WorkoutLogRef {
  id: string;
  planId: string;
  workoutId: string;
  status: WorkoutLogStatus;
}

export function resolvePlanPeriod(weekStartDate: string, today: string): PlanPeriod {
  if (today < weekStartDate) return 'upcoming';
  return today > addDays(weekStartDate, LAST_DAY_OFFSET) ? 'past' : 'current';
}

/**
 * done — a completed log exists (even if it was done late) · missed — not done and
 * its day has passed; a workout without a day is only missed once its week is over ·
 * upcoming — everything else.
 */
export function resolveWorkoutStatus(date: string | null, weekStartDate: string, today: string, isDone: boolean): WorkoutStatus {
  if (isDone) return 'done';
  const lastChance = date ?? addDays(weekStartDate, LAST_DAY_OFFSET);
  return lastChance < today ? 'missed' : 'upcoming';
}

/** `logs` may hold logs of other plans; only this plan's are used. Newest first. */
export function toTraineePlan(plan: Plan, logs: WorkoutLogRef[], today: string): TraineePlan {
  const planLogs = logs.filter((log) => log.planId === plan.id);

  const workouts = plan.workouts.map((workout): TraineePlanWorkout => {
    const workoutLogs = planLogs.filter((log) => log.workoutId === workout.id);
    const completed = workoutLogs.find((log) => log.status === 'completed');
    const date = workout.dayOfWeek === undefined ? null : addDays(plan.weekStartDate, workout.dayOfWeek);

    return {
      ...workout,
      status: resolveWorkoutStatus(date, plan.weekStartDate, today, completed !== undefined),
      date,
      isToday: date === today,
      inProgress: !completed && workoutLogs.some((log) => log.status === 'in_progress'),
      logId: completed?.id ?? null,
    };
  });

  return { ...plan, period: resolvePlanPeriod(plan.weekStartDate, today), workouts };
}

/**
 * What "Start next workout" opens, in the plan's own order: the workout in progress,
 * else the first upcoming one, else the earliest missed one — a missed workout can
 * still be done until its week ends (owner decision) — else nothing.
 */
export function pickNextWorkoutId(plan: TraineePlan): string | null {
  if (plan.period !== 'current') return null;
  // "Start next workout" opens a strength session; cardio workouts start from their own page.
  const strength = plan.workouts.filter((workout) => workout.kind !== 'cardio');
  const next =
    strength.find((workout) => workout.inProgress) ??
    strength.find((workout) => workout.status === 'upcoming') ??
    strength.find((workout) => workout.status === 'missed');
  return next?.id ?? null;
}
