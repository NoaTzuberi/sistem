import type { AchievementProgress, AchievementType, WorkoutLog } from '@sistem/types';

// The workout summary's numbers, read from the finished log (the server computed stats and PRs).

export interface RecapRow {
  key: string;
  exerciseId: string;
  done: number;
  total: number;
  /** Reps of the done sets as a range ("10–12"), or null (holds / nothing done). */
  reps: { min: number; max: number } | null;
  pr: boolean;
}

/** One row per exercise of the log, in workout order. */
export function recapOf(log: WorkoutLog): RecapRow[] {
  const rows = new Map<string, RecapRow & { repsList: number[] }>();
  for (const set of log.sets) {
    const key = set.planExerciseId ?? set.exerciseId;
    let row = rows.get(key);
    if (!row) {
      row = { key, exerciseId: set.exerciseId, done: 0, total: 0, reps: null, pr: false, repsList: [] };
      rows.set(key, row);
    }
    row.total += 1;
    if (set.completed) {
      row.done += 1;
      if (set.reps !== undefined) row.repsList.push(set.reps);
    }
  }
  const prs = new Set((log.personalRecords ?? []).map((record) => record.exerciseId));
  return [...rows.values()].map(({ repsList, ...row }) => ({
    ...row,
    reps: repsList.length > 0 ? { min: Math.min(...repsList), max: Math.max(...repsList) } : null,
    pr: prs.has(row.exerciseId),
  }));
}

/** Whole minutes, at least 1. */
export function durationMinutes(durationSec: number): number {
  return Math.max(1, Math.round(durationSec / 60));
}

/** "20.10" for the eyebrow — day and month, the same in both languages. */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const WORKOUT_COUNT_TYPES: ReadonlySet<AchievementType> = new Set<AchievementType>(['first_workout', 'workouts_5', 'workouts_10', 'workouts_25', 'workouts_50', 'workouts_100']);

/** The next locked "completed workouts" achievement (5, 10, 25…), or null when she has them all. */
export function nextWorkoutAchievement(progress: AchievementProgress[]): (AchievementProgress & { threshold: number }) | null {
  const open = progress.filter(
    (entry): entry is AchievementProgress & { threshold: number } =>
      WORKOUT_COUNT_TYPES.has(entry.type) && !entry.repeatable && entry.count === 0 && entry.threshold !== undefined,
  );
  return open.sort((a, b) => a.threshold - b.threshold)[0] ?? null;
}
