import type { Types } from 'mongoose';
import type { CardioBlockKind, CardioMetric, CardioSessionStatus, CardioSport } from '@sistem/types';

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

export interface CardioSessionDocument {
  traineeId: Types.ObjectId;
  coachId: Types.ObjectId;
  name: string;
  sport: CardioSport;
  metric: CardioMetric;
  steps: CardioStepFields[];
  note?: string | null;
  days: number[];
  repeatsWeekly: boolean;
  weekStartDate: string;
  status: CardioSessionStatus;
  /** Removed by the coach: hidden everywhere, kept so her logs still point at it. */
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardioLogDocument {
  traineeId: Types.ObjectId;
  sessionId: Types.ObjectId;
  sessionName: string;
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
