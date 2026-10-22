import { Schema, Types, model } from 'mongoose';
import type { CoachingStatus } from '@sistem/types';
import { COACHING_STATUS_IDS, LIVE_COACHING_STATUSES, MAX_DISCIPLINE_LENGTH } from './coaching.constants';

// The private trainee ↔ coach relationship. Coach-owned data (plans, workout / cardio logs,
// nutrition, coach notes, AI drafts) carries its `coachingId`; ending a coaching keeps all of it.

export interface CoachingDocument {
  traineeId: Types.ObjectId;
  coachId: Types.ObjectId;
  status: CoachingStatus;
  /** status !== 'ended' — kept as a field so the "one live coaching per pair" index can use it. */
  live: boolean;
  discipline: string | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const coachingSchema = new Schema<CoachingDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: COACHING_STATUS_IDS, required: true, default: 'waiting' },
    live: { type: Boolean, required: true, default: true },
    discipline: { type: String, trim: true, maxlength: MAX_DISCIPLINE_LENGTH, default: null },
    startedAt: { type: Date, required: true, default: () => new Date() },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

coachingSchema.pre('validate', function syncLive() {
  this.live = (LIVE_COACHING_STATUSES as readonly string[]).includes(this.status);
});

// One live coaching per trainee + coach PAIR. Deliberately no index limiting a trainee to one
// live coaching overall — that rule is MULTI_COACH_ENABLED, in code (coaching.service).
coachingSchema.index(
  { traineeId: 1, coachId: 1 },
  { unique: true, partialFilterExpression: { live: true }, name: 'one_live_per_pair' },
);
coachingSchema.index({ traineeId: 1, live: 1, startedAt: -1 });
coachingSchema.index({ coachId: 1, live: 1, startedAt: -1 });

export const Coaching = model<CoachingDocument>('Coaching', coachingSchema);
