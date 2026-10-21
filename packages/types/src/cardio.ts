import type { PlanWorkout, WorkoutStatus } from './index';

// Cardio workouts (run / intervals / walk / bike): a workout `kind` inside the weekly Plan, next to
// strength workouts. Day, note and repeating come from the plan workout itself; `cardio` holds the
// blocks. Units: seconds, km. Intensity is stored 1–10; how it is shown (RPE "8/10" or a heart-rate
// zone Z1–Z5) follows the metric.

export type WorkoutKind = 'strength' | 'cardio';
export type CardioSport = 'run' | 'intervals' | 'walk' | 'bike';
export type CardioMetric = 'rpe' | 'pace' | 'speed' | 'hrZone';
export type CardioBlockKind = 'warmup' | 'steady' | 'work' | 'recovery' | 'cooldown';

export interface CardioBlock {
  type: 'block';
  /** Client-made, stable while editing (a graph bar and its row share it). */
  id: string;
  kind: CardioBlockKind;
  durationSec: number;
  /** 1–10. */
  intensity: number;
}

export interface CardioRepeatSet {
  type: 'repeat';
  id: string;
  /** 1–30 rounds. */
  times: number;
  blocks: CardioBlock[];
}

export type CardioStep = CardioBlock | CardioRepeatSet;

/** A cardio workout's own content (`PlanWorkout.cardio`). */
export interface PlanCardio {
  sport: CardioSport;
  metric: CardioMetric;
  steps: CardioStep[];
}

export interface CardioLog {
  id: string;
  planId: string;
  /** The PlanWorkout's id. */
  workoutId: string;
  /** Copied when saved, so history survives later edits. */
  workoutTitle: string;
  sport: CardioSport;
  /** The day she did it for ('YYYY-MM-DD' in her zone): the workout's day, else the day she ran it. */
  date: string;
  completedSec: number;
  roundsDone: number;
  roundsTotal: number;
  highIntensitySec: number;
  distanceKm: number | null;
  /** 1–10, how hard it felt. */
  rpe: number;
  note: string | null;
  createdAt: string;
}

export interface SaveCardioLogPayload {
  planId: string;
  workoutId: string;
  completedSec: number;
  roundsDone: number;
  highIntensitySec: number;
  distanceKm?: number | null;
  rpe: number;
  note?: string | null;
}

/** GET /api/cardio/plans/:planId/workouts/:workoutId — one cardio workout of her published plan. */
export interface TraineeCardioWorkoutResponse {
  planId: string;
  weekStartDate: string;
  workout: PlanWorkout & { kind: 'cardio'; cardio: PlanCardio };
  /** Its day ('YYYY-MM-DD'), or null for a workout without a day. */
  date: string | null;
  status: WorkoutStatus;
  log: CardioLog | null;
  coach: { name: string } | null;
  /** A workout of this week, not logged yet: she can run it (decided on the server). */
  canStart: boolean;
}

/** GET /api/coach/trainees/:id/cardio-logs */
export interface CoachCardioLogList {
  /** Newest first. */
  items: CardioLog[];
}
