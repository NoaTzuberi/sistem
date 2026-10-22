import type { Types } from 'mongoose';
import type { PortionCounts } from '@sistem/types';

export interface MealPhotoFields {
  /** Missing on photos saved before a meal could hold several. */
  _id?: Types.ObjectId;
  /** A plan meal's id, or a default meal id ('breakfast' …) for portions-only / her own target. */
  mealId: Types.ObjectId | string;
  /** The meal's name when the photo was added — an edited plan never renames it. */
  mealName: string;
  /** Cloudinary public id (authenticated asset); never sent to a client. */
  publicId: string;
  uploadedAt: Date;
}

/** One trainee, one day: the portions she marked against that day's plan (Phase 13a+). */
export interface MealLogDocument {
  traineeId: Types.ObjectId;
  /** 'plan' = against a coach's nutrition plan; 'own' = against her own target (trainee-owned). */
  source?: 'plan' | 'own';
  coachingId: Types.ObjectId | null;
  coachId: Types.ObjectId | null;
  /** 'YYYY-MM-DD' in her time zone. */
  date: string;
  planId: Types.ObjectId | null;
  planVersion: number | null;
  /** The day's planned portions in that version — a later version never rewrites a past day. */
  planned: PortionCounts;
  eaten: PortionCounts;
  photos: MealPhotoFields[];
  createdAt: Date;
  updatedAt: Date;
}
