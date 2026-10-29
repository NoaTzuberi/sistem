import { Schema, model } from 'mongoose';
import { PLAN_STATUS_IDS, DEFAULT_PLAN_STATUS } from './plan.constants';
import { planWorkoutSchema } from './planWorkout.schema';
import { isSunday } from './planWeek';
import type { PlanDocument } from './plan.types';
import { coachingIdField, fillCoachingFromPair } from '../coachings/coachingRef';

const planSchema = new Schema<PlanDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The coaching (trainee ↔ this coach) the plan belongs to: coaches read plans only through it.
    coachingId: coachingIdField,
    // 'YYYY-MM-DD' of the Sunday that starts the week, in the trainee's time zone.
    weekStartDate: {
      type: String,
      required: true,
      validate: { validator: isSunday, message: 'weekStartDate must be a Sunday (YYYY-MM-DD).' },
    },
    status: { type: String, enum: PLAN_STATUS_IDS, required: true, default: DEFAULT_PLAN_STATUS },
    publishedAt: { type: Date, default: null },
    // When the trainee's view of this plan last changed: publish, or a save while published
    // (the Workouts tab dot, Phase 13a). Unset on plans from before 13a → publishedAt.
    liveUpdatedAt: { type: Date, default: null },
    notes: { type: String, trim: true },
    // The coach's message + tip sent with the publish, stored as sent (may say {name}, filled when
    // read). Set only by publish; a later default never changes them. Never copied by duplicate.
    introMessage: { type: String, default: null },
    introTip: { type: String, default: null },
    workouts: { type: [planWorkoutSchema], default: [] },
    // The AI recommendation the coach loaded into this plan (Phase 12) — coach-only, so the
    // builder can show its rationale. Never copied by "duplicate last week".
    aiRecommendationId: { type: Schema.Types.ObjectId, ref: 'AiRecommendation', default: undefined },
    // Phase 12b (coach-only): the split the plan follows.
    splitId: { type: String, trim: true, default: undefined },
  },
  { timestamps: true },
);

fillCoachingFromPair(planSchema);

// One plan per coaching per week: a draft becomes published in place. (Per coaching, not per
// trainee, so two coaches can each plan the same week once multi-coach is on.)
planSchema.index({ coachingId: 1, weekStartDate: 1 }, { unique: true });
planSchema.index({ traineeId: 1, status: 1, weekStartDate: -1 });
planSchema.index({ coachId: 1, status: 1, weekStartDate: -1 });

export const Plan = model<PlanDocument>('Plan', planSchema);
