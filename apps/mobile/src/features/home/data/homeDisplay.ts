import type { AchievementProgress, TraineePlan, TraineePlanWorkout, TraineeWeek } from '@sistem/types';
import { addDaysToDate, isVolumeAchievement } from '@sistem/shared';

// Home (direction B) as plain functions. Every status here is the server's (done / missed / today
// come from /plans/week in her zone); these only arrange them for the screen.

const DAYS_IN_WEEK = 7;
/** How many identity colors there are (--color-workout-1 … -5 in the tokens), as in the plan builder. */
const WORKOUT_COLOR_COUNT = 5;
/** One tick per unit up to this; a bigger target is drawn in this many segments. */
export const MAX_TICKS = 30;
/** Close achievements shown as mini chips under the next one. */
const OTHER_ACHIEVEMENTS = 3;

const HEBREW = /[֐-׿]/;

/** The class carrying a workout's identity color: by its place in the plan, cycling (like the plan builder). */
export function workoutColorClass(index: number): string {
  return `workout-color-${(index % WORKOUT_COLOR_COUNT) + 1}`;
}

/** Coach-written names may be Hebrew (Rubik, upright) or Latin (Barlow italic). */
export function isHebrewText(text: string): boolean {
  return HEBREW.test(text);
}

/** "Maya Cohen" → "MC"; one word → its first letter. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('')
    .toUpperCase();
}

export interface PlannedWorkout {
  workout: TraineePlanWorkout;
  colorClass: string;
}

/** The server's status of a day, from its workouts (rest = none planned). */
export type LaneState = 'done' | 'planned' | 'missed' | 'rest';

/**
 * How a lane is drawn (docs/design/trainee-home-b.html):
 * done = filled with the workout's color · today = ink (not done yet — a workout or a rest day) ·
 * planned = a white column ringed in its color · missed = soft, a small dot in its color · rest = a hairline.
 * Today keeps the pulsing dot whatever it shows — done included.
 */
export type LaneLook = 'done' | 'today' | 'planned' | 'missed' | 'rest';

export interface WeekDay {
  dayOfWeek: number;
  date: string;
  isToday: boolean;
  state: LaneState;
  look: LaneLook;
  /** The pulsing "today" dot. */
  pulse: boolean;
  /** The color the lane is drawn in: its first done workout when done, else its first workout. */
  colorClass: string | null;
  workouts: PlannedWorkout[];
}

function laneState(workouts: PlannedWorkout[]): LaneState {
  if (workouts.length === 0) return 'rest';
  if (workouts.every(({ workout }) => workout.status === 'done')) return 'done';
  if (workouts.some(({ workout }) => workout.status === 'missed')) return 'missed';
  return 'planned';
}

export function laneLook(state: LaneState, isToday: boolean): LaneLook {
  if (state === 'done') return state;
  return isToday ? 'today' : state;
}

function laneColor(state: LaneState, workouts: PlannedWorkout[]): string | null {
  const lead = state === 'done' ? workouts.find(({ workout }) => workout.status === 'done') : workouts[0];
  return lead?.colorClass ?? null;
}

/** Sunday → Saturday. Workouts without a day are not on the track (as before). */
export function buildWeekDays(week: TraineeWeek): WeekDay[] {
  const planned = (week.plan?.workouts ?? []).map((workout, index) => ({ workout, colorClass: workoutColorClass(index) }));
  return Array.from({ length: DAYS_IN_WEEK }, (_, dayOfWeek) => {
    const workouts = planned.filter(({ workout }) => workout.dayOfWeek === dayOfWeek);
    const date = addDaysToDate(week.weekStartDate, dayOfWeek);
    const isToday = date === week.today;
    const state = laneState(workouts);
    return {
      dayOfWeek,
      date,
      isToday,
      state,
      look: laneLook(state, isToday),
      pulse: isToday,
      colorClass: laneColor(state, workouts),
      workouts,
    };
  });
}

/**
 * What the stage shows:
 * - workout: the next workout is for today, has no day (any day is fine), or is open — the slider;
 * - rest: the next workout is on a later day (or a missed one) — "rest day" + its info, no slider;
 * - finished / empty / noPlan: a line instead.
 */
export type StageState =
  | { kind: 'workout'; plan: TraineePlan; next: PlannedWorkout }
  | { kind: 'rest'; plan: TraineePlan; next: PlannedWorkout | null }
  | { kind: 'finished' | 'empty'; plan: TraineePlan }
  | { kind: 'noPlan' };

export function stageState(week: TraineeWeek): StageState {
  const plan = week.plan;
  if (!plan) return { kind: 'noPlan' };
  if (plan.workouts.length === 0) return { kind: 'empty', plan };
  const index = plan.workouts.findIndex((workout) => workout.id === week.nextWorkoutId);
  if (index === -1) return { kind: 'finished', plan };
  const next = { workout: plan.workouts[index], colorClass: workoutColorClass(index) };
  const doableToday = next.workout.isToday || next.workout.inProgress || next.workout.dayOfWeek === undefined;
  return doableToday ? { kind: 'workout', plan, next } : { kind: 'rest', plan, next };
}

/** Workouts done / planned this week (the server's statuses). */
export function weekCount(plan: TraineePlan | null): { done: number; planned: number } | null {
  if (!plan || plan.workouts.length === 0) return null;
  return { done: plan.workouts.filter((workout) => workout.status === 'done').length, planned: plan.workouts.length };
}

/** "05" — the stage's facts are scoreboard numbers. */
export function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

// Home shows no volume (owner decision): lifetime-volume achievements stay on the Achievements screen.
function isOpenTarget(progress: AchievementProgress): progress is AchievementProgress & { threshold: number } {
  if (isVolumeAchievement(progress.type)) return false;
  return !progress.repeatable && progress.count === 0 && progress.threshold !== undefined && progress.threshold > 0;
}

/**
 * The next achievement = the locked one-time achievement she is closest to (fraction done), ties in
 * the server's config order; the following ones are the "close" chips. Achievement at 0 everywhere
 * → the first of the config.
 */
export function pickNextAchievements(progress: AchievementProgress[]): {
  next: (AchievementProgress & { threshold: number }) | null;
  others: (AchievementProgress & { threshold: number })[];
} {
  const open = progress.filter(isOpenTarget);
  const ranked = open
    .map((entry, order) => ({ entry, order, fraction: Math.min(1, entry.current / entry.threshold) }))
    .sort((a, b) => b.fraction - a.fraction || a.order - b.order)
    .map(({ entry }) => entry);
  return { next: ranked[0] ?? null, others: ranked.slice(1, 1 + OTHER_ACHIEVEMENTS) };
}

export type TickState = 'done' | 'next' | 'rest';

/** One tick per unit (≤ MAX_TICKS), else MAX_TICKS segments; the first not-done tick is "next". */
export function achievementTicks(current: number, threshold: number): TickState[] {
  const count = Math.min(threshold, MAX_TICKS);
  const done = Math.min(count, Math.floor((Math.min(current, threshold) / threshold) * count));
  return Array.from({ length: count }, (_, index) => (index < done ? 'done' : index === done ? 'next' : 'rest'));
}

/** 0–100 for a conic ring. */
export function achievementPercent(progress: AchievementProgress & { threshold: number }): number {
  return Math.round(Math.min(1, progress.current / progress.threshold) * 100);
}
