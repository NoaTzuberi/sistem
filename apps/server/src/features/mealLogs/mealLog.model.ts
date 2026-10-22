import { Schema, model } from 'mongoose';
import { coachingIdField, fillCoachingFromPair } from '../coachings/coachingRef';
import type { PortionCounts } from '@sistem/types';
import { isDateString } from '../plans/planWeek';
import type { MealLogDocument, MealPhotoFields } from './mealLog.types';

// One document per trainee and day (Phase 13a+). The 13a design had one per meal; she now
// marks portions per group for the whole day and never says which meal they were, so
// the meal only remains on the photos.

const portionCountsSchema = new Schema<PortionCounts>(
  {
    protein: { type: Number, min: 0, default: 0 },
    carb: { type: Number, min: 0, default: 0 },
    fat: { type: Number, min: 0, default: 0 },
    snack: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

// Several photos per meal and day, each with its own _id. mealId: a plan meal's id or a default meal id.
const mealPhotoSchema = new Schema<MealPhotoFields>({
  mealId: { type: Schema.Types.Mixed, required: true },
  mealName: { type: String, required: true },
  publicId: { type: String, required: true },
  uploadedAt: { type: Date, required: true },
});

function isPlanLog(this: { source?: string }): boolean {
  return this.source !== 'own';
}

const mealLogSchema = new Schema<MealLogDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // 'own' = tracked against her own target ("היעד שלי"): trainee-owned, no coach / plan.
    source: { type: String, enum: ['plan', 'own'], required: true, default: 'plan' },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: isPlanLog, default: null },
    // The nutrition plan's coaching: the coach reads plan tracking only through it.
    coachingId: { ...coachingIdField, required: isPlanLog, default: null },
    date: { type: String, required: true, validate: { validator: isDateString, message: 'date must be YYYY-MM-DD.' } },
    planId: { type: Schema.Types.ObjectId, ref: 'NutritionPlan', required: isPlanLog, default: null },
    planVersion: { type: Number, required: isPlanLog, min: 1, default: null },
    planned: { type: portionCountsSchema, required: true },
    eaten: { type: portionCountsSchema, required: true },
    photos: { type: [mealPhotoSchema], default: [] },
  },
  { timestamps: true },
);
mealLogSchema.index({ traineeId: 1, date: 1 }, { unique: true });
mealLogSchema.index({ coachingId: 1, date: 1 });
fillCoachingFromPair(mealLogSchema);

export const MealLog = model<MealLogDocument>('MealLog', mealLogSchema);

/**
 * Drops the 13a per-meal unique index (traineeId + date + mealId) where it still exists
 * and builds the per-day one. The collection had no routes before 13a+, so it is empty.
 */
export async function syncMealLogIndexes(): Promise<void> {
  await MealLog.syncIndexes();
}
