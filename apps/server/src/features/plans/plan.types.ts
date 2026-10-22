import type { Types } from 'mongoose';
import type { CardioMetric, CardioSport, PlanStatus, SetType, WorkoutKind } from '@sistem/types';
import type { CardioStepFields } from '../cardio/cardio.types';

// Units: weights kg, durations and rest seconds.
export interface PlanSetTargetFields {
  type: SetType;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
}

export interface PlanExerciseFields {
  exerciseId: Types.ObjectId;
  sets: number;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
  notes?: string;
  supersetGroup?: string;
  setTargets?: PlanSetTargetFields[];
  /** Run hands-free as work / rest intervals (timed sets only). */
  interval?: boolean;
  /** Phase 12b, coach-only: the slot of its workout's type. */
  slotId?: string;
}

export interface PlanWorkoutFields {
  title: string;
  dayOfWeek?: number;
  order: number;
  notes?: string;
  /** Phase 12b, coach-only: the workout type (slot template); missing = free workout. */
  workoutType?: string;
  /** Missing = strength. */
  kind?: WorkoutKind;
  /** A cardio workout's blocks (it has no exercises). */
  cardio?: PlanCardioFields;
  exercises: (PlanExerciseFields & { _id: Types.ObjectId })[];
}

export interface PlanCardioFields {
  sport: CardioSport;
  metric: CardioMetric;
  steps: CardioStepFields[];
}

export interface PlanDocument {
  traineeId: Types.ObjectId;
  coachingId: Types.ObjectId;
  coachId: Types.ObjectId;
  weekStartDate: string;
  status: PlanStatus;
  publishedAt?: Date | null;
  liveUpdatedAt?: Date | null;
  notes?: string;
  workouts: (PlanWorkoutFields & { _id: Types.ObjectId })[];
  aiRecommendationId?: Types.ObjectId | null;
  /** Phase 12b, coach-only. */
  splitId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
