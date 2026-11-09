import type { PlanBlockWeek, PlanWorkout } from '@sistem/types';
import type { DraftExercise } from '../types';

// Pure display rules of a multi-week plan in the builder (the server writes the weeks; this only
// says how they look): the week's color, and what changed vs the week before.

/** Week colors cycle 1–4 (weeks 5–8 reuse them). */
export const WEEK_COLOR_COUNT = 4;

export function weekColorClass(week: number): string {
  return `week-color-${((week - 1) % WEEK_COLOR_COUNT) + 1}`;
}

/** "3–4", or null when there is no week after `week`. */
export function laterWeeksRange(week: number, lengthWeeks: number): { from: number; to: number } | null {
  return week < lengthWeeks ? { from: week + 1, to: lengthWeeks } : null;
}

/** Bar heights 0–1, relative to the heaviest week of the block (empty weeks = 0). */
export function volumeShares(weeks: PlanBlockWeek[]): number[] {
  const max = Math.max(0, ...weeks.map((entry) => (entry.workoutCount > 0 ? entry.volume.value : 0)));
  return weeks.map((entry) => (max > 0 && entry.workoutCount > 0 ? entry.volume.value / max : 0));
}

export type ProgressChip = { kind: 'weight'; amount: number } | { kind: 'reps'; amount: number } | { kind: 'deload' };

function topWeight(exercise: { targetWeight?: number; setTargets?: { targetWeight?: number }[] | null }): number | undefined {
  const weights = exercise.setTargets?.length
    ? exercise.setTargets.flatMap((target) => (target.targetWeight === undefined ? [] : [target.targetWeight]))
    : exercise.targetWeight === undefined
      ? []
      : [exercise.targetWeight];
  return weights.length ? Math.max(...weights) : undefined;
}

function firstReps(exercise: { reps?: number; setTargets?: { reps?: number }[] | null }): number | undefined {
  return exercise.setTargets?.length ? exercise.setTargets[0].reps : exercise.reps;
}

function setCount(exercise: { sets?: number; setTargets?: unknown[] | null }): number {
  return exercise.setTargets?.length ?? exercise.sets ?? 0;
}

/**
 * What changed in this exercise vs the same place (same exercise) in the week before: heavier,
 * more reps, or — in the light week — fewer sets. Nothing changed / nothing to compare = null.
 */
export function progressChipFor(previous: PlanWorkout[] | undefined, workoutIndex: number, exerciseIndex: number, exercise: DraftExercise): ProgressChip | null {
  const before = previous?.[workoutIndex]?.exercises[exerciseIndex];
  if (!before || before.exerciseId !== exercise.exerciseId) return null;
  if (setCount(exercise) < setCount(before)) return { kind: 'deload' };
  const was = topWeight(before);
  const now = topWeight(exercise);
  if (was !== undefined && now !== undefined && now > was) return { kind: 'weight', amount: Math.round((now - was) * 100) / 100 };
  const repsBefore = firstReps(before);
  const repsNow = firstReps(exercise);
  if (repsBefore !== undefined && repsNow !== undefined && repsNow > repsBefore) return { kind: 'reps', amount: repsNow - repsBefore };
  return null;
}
