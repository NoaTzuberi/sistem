import { Schema, model } from 'mongoose';
import { CARDIO_SPORT_IDS, MAX_CARDIO_LOG_NOTE_LENGTH } from './cardio.constants';
import type { CardioLogDocument } from './cardio.types';

// What she did in a cardio workout of her plan (the workout itself lives in Plan.workouts, kind 'cardio').
const cardioLogSchema = new Schema<CardioLogDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    workoutId: { type: Schema.Types.ObjectId, required: true },
    // Copied when saved, so history survives later plan edits.
    workoutTitle: { type: String, required: true, trim: true },
    sport: { type: String, enum: CARDIO_SPORT_IDS, required: true },
    date: { type: String, required: true },
    completedSec: { type: Number, required: true, min: 0 },
    roundsDone: { type: Number, required: true, min: 0 },
    roundsTotal: { type: Number, required: true, min: 0 },
    highIntensitySec: { type: Number, required: true, min: 0 },
    distanceKm: { type: Number, min: 0, default: null },
    rpe: { type: Number, required: true, min: 1, max: 10 },
    note: { type: String, trim: true, maxlength: MAX_CARDIO_LOG_NOTE_LENGTH, default: null },
  },
  { timestamps: true },
);

// One log per cardio workout (like one completed strength log per workout).
cardioLogSchema.index({ traineeId: 1, planId: 1, workoutId: 1 }, { unique: true });
cardioLogSchema.index({ traineeId: 1, date: -1 });

export const CardioLog = model<CardioLogDocument>('CardioLog', cardioLogSchema);
