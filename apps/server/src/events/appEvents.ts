import { EventEmitter } from 'node:events';

// Internal domain events. Features announce what happened here; other features
// (notifications since Phase 5a, the AI recommendation in Phase 12) subscribe
// without the emitter knowing about them.

/**
 * An onboarded trainee and a coach meet: emitted once per live coaching when she completes
 * onboarding, and when an already-onboarded trainee joins a coach. (No coaching → not emitted.)
 */
export interface TraineeOnboardedEvent {
  traineeId: string;
  coachId: string;
  coachingId: string;
  completedAt: Date;
}

/** Emitted by the publish service (Phase 6) when a plan becomes visible to the trainee. */
export interface PlanPublishedEvent {
  planId: string;
  traineeId: string;
  coachId: string;
  /** 'YYYY-MM-DD' Sunday in the trainee's time zone */
  weekStartDate: string;
  publishedAt: Date;
}

/** Emitted by the workout session service (Phase 8) when a trainee finishes a workout. */
export interface WorkoutCompletedEvent {
  logId: string;
  traineeId: string;
  workoutTitle: string;
  finishedAt: Date;
}

/** Emitted by the nutrition publish service (Phase 13a) on every publish — the first and each update. */
export interface NutritionPlanPublishedEvent {
  planId: string;
  traineeId: string;
  coachId: string;
  version: number;
  publishedAt: Date;
}

interface AppEventMap {
  'trainee.onboarded': [TraineeOnboardedEvent];
  'plan.published': [PlanPublishedEvent];
  'workout.completed': [WorkoutCompletedEvent];
  'nutrition_plan.published': [NutritionPlanPublishedEvent];
}

export type AppEventName = keyof AppEventMap;

export const appEvents = new EventEmitter<AppEventMap>();

/**
 * Emits after the change is saved. A failing listener is logged and never fails
 * the request that caused the event — the data is already stored.
 */
export function emitAppEvent<K extends AppEventName>(name: K, ...args: AppEventMap[K]): void {
  for (const listener of appEvents.listeners(name)) {
    try {
      const result: unknown = (listener as (...a: AppEventMap[K]) => unknown)(...args);
      if (result instanceof Promise) {
        result.catch((error: unknown) => console.error(`[appEvents] ${name} listener failed:`, error));
      }
    } catch (error) {
      console.error(`[appEvents] ${name} listener failed:`, error);
    }
  }
}
