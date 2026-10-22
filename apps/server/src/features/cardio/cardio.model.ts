import { Schema, model } from 'mongoose';
import { CARDIO_SPORT_IDS, MAX_CARDIO_LOG_NOTE_LENGTH } from './cardio.constants';
import type { CardioLogDocument } from './cardio.types';
import { coachingIdField, fillCoachingFromPlan } from '../coachings/coachingRef';

// What she did in a cardio workout of her plan (the workout itself lives in Plan.workouts, kind 'cardio').
const cardioLogSchema = new Schema<CardioLogDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: isPlanLog, default: null },
    // The plan's coaching: the coach reads plan cardio logs only through it.
    coachingId: { ...coachingIdField, required: isPlanLog, default: null },
    workoutId: { type: Schema.Types.ObjectId, required: isPlanLog, default: null },
    // Her own cardio workout (trainee-owned): any number of runs, no plan / coaching.
    ownWorkoutId: { type: Schema.Types.ObjectId, ref: 'OwnCardioWorkout', default: null },
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

function isPlanLog(this: { ownWorkoutId?: unknown }): boolean {
  return !this.ownWorkoutId;
}

// One log per plan cardio workout (like one completed strength log per workout). Her own cardio
// workouts can be run again and again. (CardioLog.syncIndexes at start swaps the old full index.)
cardioLogSchema.index(
  { traineeId: 1, planId: 1, workoutId: 1 },
  { unique: true, partialFilterExpression: { planId: { $type: 'objectId' } }, name: 'one_log_per_plan_cardio' },
);
cardioLogSchema.index({ traineeId: 1, ownWorkoutId: 1, date: -1 });
cardioLogSchema.index({ traineeId: 1, date: -1 });
cardioLogSchema.index({ coachingId: 1, date: -1 });
fillCoachingFromPlan(cardioLogSchema);

export const CardioLog = model<CardioLogDocument>('CardioLog', cardioLogSchema);
