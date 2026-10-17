import type { WorkoutLog } from '@sistem/types';

// Free workouts ("אימון חופשי"): a workout she builds herself, outside the coach's plan. NOT supported
// by the server yet — a workout log always belongs to a plan workout. The model / API change is proposed
// in docs/phase-reports/design-trainee-workouts.md and waits for the owner's approval; until it is built
// the entry points stay hidden (VITE_FEATURE_FREE_WORKOUT=true shows the UI for review in dev only).

export const FREE_WORKOUT_ENABLED = import.meta.env.VITE_FEATURE_FREE_WORKOUT === 'true';

export type FreeWorkoutMode = 'scratch' | 'repeat' | 'muscle';

/** The onboarding muscle-focus ids (MUSCLE_FOCUS_IDS on the server) — the picker reuses their labels. */
export const FREE_WORKOUT_MUSCLES = ['legs', 'glutes', 'back', 'chest', 'shoulders', 'arms', 'core', 'full_body'] as const;
export type FreeWorkoutMuscle = (typeof FREE_WORKOUT_MUSCLES)[number];

/** PROPOSED body of POST /workout-logs/free (see the report). */
export type StartFreeWorkoutPayload =
  | { mode: 'scratch' }
  | { mode: 'repeat'; fromLogId: string }
  | { mode: 'muscle'; muscles: FreeWorkoutMuscle[] };

/** PROPOSED: a log carries `source: 'free'` when it is not from the plan. Reads false until the server sends it. */
export function isFreeLog(log: WorkoutLog): boolean {
  return (log as WorkoutLog & { source?: 'plan' | 'free' }).source === 'free';
}
