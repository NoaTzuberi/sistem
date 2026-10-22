import { Schema, Types, model } from 'mongoose';
import type { PortionCounts } from '@sistem/types';

// "היעד שלי": the daily portions a self-guided trainee sets for herself (no coach nutrition plan).
// Trainee-owned. Her portion tracking and meal photos run against it until a coach publishes a plan.

export interface OwnNutritionTargetDocument {
  traineeId: Types.ObjectId;
  portions: PortionCounts;
  /** Vegetables are free (not counted) — shown as a line, never tracked. */
  freeVegetables: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const portionsSchema = new Schema<PortionCounts>(
  {
    protein: { type: Number, min: 0, required: true },
    carb: { type: Number, min: 0, required: true },
    fat: { type: Number, min: 0, required: true },
    snack: { type: Number, min: 0, required: true },
  },
  { _id: false },
);

const ownNutritionTargetSchema = new Schema<OwnNutritionTargetDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    portions: { type: portionsSchema, required: true },
    freeVegetables: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export const OwnNutritionTarget = model<OwnNutritionTargetDocument>('OwnNutritionTarget', ownNutritionTargetSchema);
