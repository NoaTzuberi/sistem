import type { CoachAttention, CoachTraineeThisWeek, CoachingStatus, CoachWeekWorkout, WorkoutStatus } from '@sistem/types';
import { addDays, daysBetween } from '../plans/planWeek';
import { resolveWorkoutStatus } from '../plans/planStatus';

/**
 * Coach mode: which trainees need her attention, her week, and her coaching week. Pure — dates are
 * 'YYYY-MM-DD' in the TRAINEE's zone (they compare as strings).
 *
 * The attention rule (owner, coach app spec): an ACTIVE coaching (she has had a published plan) where
 *  - she has no completed workout for `noWorkoutDays` days or more. The days count from the later of her
 *    last completed workout (strength, free or cardio) and the first day of her first published plan, so a
 *    trainee who just got her first plan is not flagged for the days before it; or
 *  - she missed `missedThisWeek` or more planned workouts of this week (a dated workout whose day passed).
 * When both apply, "no workout" is shown (it says more). Waiting / new trainees are never flagged —
 * they are waiting for the coach, not the other way round.
 */
export const ATTENTION_CONFIG = {
  noWorkoutDays: 5,
  missedThisWeek: 2,
} as const;

export interface AttentionInput {
  coachingStatus: CoachingStatus;
  today: string;
  /** Her newest completed workout's day, or null. */
  lastCompletedDate: string | null;
  /** The Sunday of her first published plan's week, or null. */
  firstPlanWeek: string | null;
  /** Missed workouts of this week's plan. */
  missedThisWeek: number;
}

export function resolveAttention(input: AttentionInput, config = ATTENTION_CONFIG): CoachAttention | null {
  if (input.coachingStatus !== 'active' || !input.firstPlanWeek) return null;
  const since = input.lastCompletedDate && input.lastCompletedDate > input.firstPlanWeek ? input.lastCompletedDate : input.firstPlanWeek;
  const days = daysBetween(since, input.today);
  if (days >= config.noWorkoutDays) return { reason: 'no_workout', days };
  if (input.missedThisWeek >= config.missedThisWeek) return { reason: 'missed_workouts', count: input.missedThisWeek };
  return null;
}

/** "Week N" of her coaching: 1 = the week of her first published plan; null before it starts. */
export function coachingWeekNumber(firstPlanWeek: string | null, currentWeek: string): number | null {
  if (!firstPlanWeek || currentWeek < firstPlanWeek) return null;
  return Math.floor(daysBetween(firstPlanWeek, currentWeek) / 7) + 1;
}

export interface WeekPlanInput {
  id: string;
  weekStartDate: string;
  splitId: string | null;
  workouts: { id: string; title: string; kind?: 'strength' | 'cardio'; dayOfWeek?: number | null }[];
}

/** This week's plan with the server's statuses (the same rule as her Home). `isDone` = a completed log. */
export function buildThisWeek(plan: WeekPlanInput, today: string, isDone: (workoutId: string) => boolean): CoachTraineeThisWeek {
  const workouts: CoachWeekWorkout[] = plan.workouts.map((workout) => {
    const dayOfWeek = workout.dayOfWeek ?? null;
    const status: WorkoutStatus = resolveWorkoutStatus(
      dayOfWeek === null ? null : addDays(plan.weekStartDate, dayOfWeek),
      plan.weekStartDate,
      today,
      isDone(workout.id),
    );
    return { id: workout.id, title: workout.title, kind: workout.kind ?? 'strength', dayOfWeek, status };
  });
  const count = (status: WorkoutStatus) => workouts.filter((workout) => workout.status === status).length;
  return { planId: plan.id, splitId: plan.splitId, workouts, planned: workouts.length, completed: count('done'), missed: count('missed') };
}

/** Week of the year for the Today stage: weeks start on Sunday and week 1 is the one holding 1 January. */
export function weekOfYear(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const dayOfYear = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000);
  const firstWeekday = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  return Math.floor((dayOfYear + firstWeekday) / 7) + 1;
}
