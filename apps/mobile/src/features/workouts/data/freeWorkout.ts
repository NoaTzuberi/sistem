import type { FreeWorkoutMuscle, StartFreeWorkoutPayload, WorkoutLog } from '@sistem/types';

// Free workouts ("אימון חופשי"): a workout she builds herself, outside any coach's plan (server:
// POST /workout-logs/free — the log is trainee-owned, source 'free').

export type FreeWorkoutMode = StartFreeWorkoutPayload['mode'];
export type { FreeWorkoutMuscle, StartFreeWorkoutPayload };

/** The onboarding muscle-focus ids (MUSCLE_FOCUS_IDS on the server) — the picker reuses their labels. */
export const FREE_WORKOUT_MUSCLES: FreeWorkoutMuscle[] = ['legs', 'glutes', 'back', 'chest', 'shoulders', 'arms', 'core', 'full_body'];

export function isFreeLog(log: Pick<WorkoutLog, 'source'>): boolean {
  return log.source === 'free';
}
