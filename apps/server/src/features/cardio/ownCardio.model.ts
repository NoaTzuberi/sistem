import { Schema, Types, model } from 'mongoose';
import { planCardioSchema } from '../plans/planWorkout.schema';
import type { PlanCardioFields } from '../plans/plan.types';

// A cardio workout she built herself ("בניית אימון ריצה"): trainee-owned, outside any plan or
// coaching. Same blocks / repeat sets as a coach's cardio workout; the same player runs it.
// Deleting only archives it, so its logs keep their title.

export interface OwnCardioWorkoutDocument {
  traineeId: Types.ObjectId;
  title: string;
  cardio: PlanCardioFields;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ownCardioWorkoutSchema = new Schema<OwnCardioWorkoutDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    cardio: { type: planCardioSchema, required: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ownCardioWorkoutSchema.index({ traineeId: 1, archivedAt: 1, updatedAt: -1 });

export const OwnCardioWorkout = model<OwnCardioWorkoutDocument>('OwnCardioWorkout', ownCardioWorkoutSchema);
