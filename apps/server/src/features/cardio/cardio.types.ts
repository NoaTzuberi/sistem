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
  planId: Types.ObjectId;
  /** The PlanWorkout subdocument _id (a cardio workout). */
  workoutId: Types.ObjectId;
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
