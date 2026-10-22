import { Schema, model } from 'mongoose';
import { SET_TYPE_IDS } from '../plans/plan.constants';
import { WORKOUT_LOG_SOURCE_IDS, WORKOUT_LOG_STATUS_IDS, DEFAULT_WORKOUT_LOG_STATUS, MIN_RATING, MAX_RATING, MAX_NOTES_LENGTH } from './workoutLog.constants';
import type { FreeExerciseFields, PrivatePhoto, WorkoutLogDocument, WorkoutLogSetFields, WorkoutLogStatsFields } from './workoutLog.types';
import { coachingIdField, fillCoachingFromPlan } from '../coachings/coachingRef';

const logSetSchema = new Schema<WorkoutLogSetFields>(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    planExerciseId: { type: Schema.Types.ObjectId },
    setIndex: { type: Number, required: true, min: 0 },
    // Copied from the planned set, so history shows warm-up / drop sets.
    type: { type: String, enum: SET_TYPE_IDS },
    reps: { type: Number, min: 0 },
    weight: { type: Number, min: 0 }, // kg
    durationSec: { type: Number, min: 0 },
    completed: { type: Boolean, required: true, default: false },
    completedAt: { type: Date },
  },
  { _id: false },
);

const statsSchema = new Schema<WorkoutLogStatsFields>(
  {
    durationSec: { type: Number, required: true, min: 0 },
    totalVolume: { type: Number, required: true, min: 0 }, // kg
    setsCompleted: { type: Number, required: true, min: 0 },
    prCount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const privatePhotoSchema = new Schema<PrivatePhoto>(
  {
    publicId: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

function isPlanLog(this: { source?: string }): boolean {
  return this.source !== 'free';
}

const freeExerciseSchema = new Schema<FreeExerciseFields>({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
});

const workoutLogSchema = new Schema<WorkoutLogDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // 'free' = a workout she built herself: trainee-owned, no plan and no coaching.
    source: { type: String, enum: WORKOUT_LOG_SOURCE_IDS, required: true, default: 'plan' },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: isPlanLog, default: null },
    // The plan's coaching, copied at start: the coach reads plan logs only through it.
    coachingId: { ...coachingIdField, required: isPlanLog, default: null },
    // The PlanWorkout subdocument _id inside the plan.
    workoutId: { type: Schema.Types.ObjectId, required: isPlanLog, default: null },
    // Free workouts only: the exercises she picked (the session builds its workout from them).
    freeExercises: { type: [freeExerciseSchema], default: undefined },
    // Copied at start, so history survives later plan edits.
    workoutTitle: { type: String, required: true, trim: true },
    status: { type: String, enum: WORKOUT_LOG_STATUS_IDS, required: true, default: DEFAULT_WORKOUT_LOG_STATUS },
    // Server time (PRD §11: timers use the server).
    startedAt: { type: Date, required: true, default: () => new Date() },
    finishedAt: { type: Date, default: null },
    sets: { type: [logSetSchema], default: [] },
    // Computed when the workout is finished, PRs included (Phase 9).
    stats: { type: statsSchema, default: undefined },
    // The summary (PRD §5.3) — she can change it any time after finishing.
    rating: { type: Number, min: MIN_RATING, max: MAX_RATING },
    notes: { type: String, trim: true, maxlength: MAX_NOTES_LENGTH },
    // Cloudinary authenticated asset; served only as a short-lived signed link.
    pumpPhoto: { type: privatePhotoSchema, default: undefined },
  },
  { timestamps: true },
);

fillCoachingFromPlan(workoutLogSchema);

workoutLogSchema.index({ traineeId: 1, startedAt: -1 });
workoutLogSchema.index({ coachingId: 1, startedAt: -1 });
workoutLogSchema.index({ traineeId: 1, source: 1, startedAt: -1 });
workoutLogSchema.index({ traineeId: 1, planId: 1, workoutId: 1 });
// One active session per trainee at a time.
workoutLogSchema.index(
  { traineeId: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' }, name: 'one_active_log_per_trainee' },
);

export const WorkoutLog = model<WorkoutLogDocument>('WorkoutLog', workoutLogSchema);
