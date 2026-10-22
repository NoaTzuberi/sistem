import type { Types } from 'mongoose';
import type { SetType, WorkoutLogSource, WorkoutLogStatus } from '@sistem/types';

// Units: weight kg, durations seconds.
export interface WorkoutLogSetFields {
  exerciseId: Types.ObjectId;
  planExerciseId?: Types.ObjectId;
  setIndex: number;
  type?: SetType;
  reps?: number;
  weight?: number;
  durationSec?: number;
  completed: boolean;
  completedAt?: Date;
}

export interface WorkoutLogStatsFields {
  durationSec: number;
  totalVolume: number;
  setsCompleted: number;
  prCount: number;
}

export interface PrivatePhoto {
  // Cloudinary public id of an authenticated asset — delivered only via signed URLs.
  publicId: string;
  uploadedAt: Date;
}

/** A free workout's own exercise list (its _id is the planExerciseId of its sets). */
export interface FreeExerciseFields {
  _id: Types.ObjectId;
  exerciseId: Types.ObjectId;
}

export interface WorkoutLogDocument {
  traineeId: Types.ObjectId;
  /** 'plan' = a workout of a coach's plan; 'free' = one she built herself (trainee-owned, no plan / coaching). */
  source: WorkoutLogSource;
  coachingId: Types.ObjectId | null;
  planId: Types.ObjectId | null;
  workoutId: Types.ObjectId | null;
  freeExercises?: FreeExerciseFields[];
  workoutTitle: string;
  status: WorkoutLogStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  sets: WorkoutLogSetFields[];
  stats?: WorkoutLogStatsFields;
  rating?: number;
  notes?: string;
  pumpPhoto?: PrivatePhoto;
  createdAt: Date;
  updatedAt: Date;
}
