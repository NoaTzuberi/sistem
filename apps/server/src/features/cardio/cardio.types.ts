import type { Types } from 'mongoose';
import type { CardioBlockKind, CardioSport } from '@sistem/types';

export interface CardioBlockFields {
  type: 'block';
  id: string;
  kind: CardioBlockKind;
  durationSec: number;
  intensity: number;
}

export interface CardioRepeatFields {
  type: 'repeat';
  id: string;
  times: number;
  blocks: CardioBlockFields[];
}

export type CardioStepFields = CardioBlockFields | CardioRepeatFields;

export interface CardioLogDocument {
  traineeId: Types.ObjectId;
  /** Plan cardio only; her own cardio belongs to no coaching. */
  coachingId: Types.ObjectId | null;
  planId: Types.ObjectId | null;
  /** The PlanWorkout subdocument _id (a cardio workout). */
  workoutId: Types.ObjectId | null;
  /** Her own cardio workout (OwnCardioWorkout) — set instead of planId / workoutId. */
  ownWorkoutId: Types.ObjectId | null;
  workoutTitle: string;
  sport: CardioSport;
  date: string;
  completedSec: number;
  roundsDone: number;
  roundsTotal: number;
  highIntensitySec: number;
  distanceKm?: number | null;
  rpe: number;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
