import mongoose, { Schema } from 'mongoose';
import type { Types } from 'mongoose';
import { Coaching } from './coaching.model';

// `coachingId` on coach-owned records. Services set it explicitly; these fallbacks fill it when a
// record is created with only its trainee + coach (or its plan), so no write path can leave it empty.

export const coachingIdField = { type: Schema.Types.ObjectId, ref: 'Coaching', required: true } as const;

interface PairDoc {
  coachingId?: Types.ObjectId | null;
  traineeId?: Types.ObjectId | null;
  coachId?: Types.ObjectId | null;
}

/** For records with traineeId + coachId: the pair's live coaching, else its newest ended one. */
export function fillCoachingFromPair(schema: Schema): void {
  schema.pre('validate', async function fillFromPair(this: PairDoc) {
    if (this.coachingId || !this.traineeId || !this.coachId) return;
    const coaching = await Coaching.findOne({ traineeId: this.traineeId, coachId: this.coachId })
      .sort({ live: -1, startedAt: -1 })
      .select('_id')
      .lean();
    if (coaching) this.coachingId = coaching._id;
  });
}

/** For logs: the coaching of the plan they belong to. */
export function fillCoachingFromPlan(schema: Schema): void {
  schema.pre('validate', async function fillFromPlan(this: { coachingId?: Types.ObjectId | null; planId?: Types.ObjectId | null }) {
    if (this.coachingId || !this.planId) return;
    // By name: the Plan model imports this file (no import cycle).
    const plan = await mongoose.model('Plan').findById(this.planId).select('coachingId').lean<{ coachingId?: Types.ObjectId }>();
    if (plan?.coachingId) this.coachingId = plan.coachingId;
  });
}
