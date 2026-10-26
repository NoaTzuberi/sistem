import type { CardioLog, WorkoutLog } from '@sistem/types';

export type LoggedWorkout = { kind: 'strength'; log: WorkoutLog } | { kind: 'cardio'; log: CardioLog };

/** A finished workout and when it ended. */
export type DatedWorkout = LoggedWorkout & { at: string };

/** Her finished workouts (strength + cardio), newest first. */
export function mergeLoggedWorkouts(strength: WorkoutLog[], cardio: CardioLog[]): DatedWorkout[] {
  return [
    ...strength.filter((log) => log.status === 'completed').map((log) => ({ kind: 'strength' as const, log, at: log.finishedAt ?? log.startedAt })),
    ...cardio.map((log) => ({ kind: 'cardio' as const, log, at: log.createdAt })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}
