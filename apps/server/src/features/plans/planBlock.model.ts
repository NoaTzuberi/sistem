import { Schema, model, type Types } from 'mongoose';
import { PLAN_STATUS_IDS, DEFAULT_PLAN_STATUS, MIN_BLOCK_WEEKS, MAX_BLOCK_WEEKS } from './plan.constants';
import { isSunday } from './planWeek';
import type { PlanStatus } from '@sistem/types';

// A multi-week plan ("חודשית"): its weeks are ordinary Plans (blockId + blockWeek), so everything
// that works week by week (her week, statuses, logs, records, streaks) keeps working untouched.
// The unique (coachingId, weekStartDate) index on Plan is what keeps blocks from overlapping.

export interface PlanBlockDocument {
  coachingId: Types.ObjectId;
  traineeId: Types.ObjectId;
  coachId: Types.ObjectId;
  /** 'YYYY-MM-DD' Sunday of week 1, in the trainee's zone. */
  startWeek: string;
  lengthWeeks: number;
  /** All weeks publish and unpublish together. */
  status: PlanStatus;
  /** The last week is a "שבוע קל" when weeks are copied. */
  deloadLastWeek: boolean;
  /** The coach was told "the plan ends this week" (created lazily — no scheduler). */
  endingNotifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const planBlockSchema = new Schema<PlanBlockDocument>(
  {
    coachingId: { type: Schema.Types.ObjectId, ref: 'Coaching', required: true },
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startWeek: { type: String, required: true, validate: { validator: isSunday, message: 'startWeek must be a Sunday (YYYY-MM-DD).' } },
    lengthWeeks: { type: Number, required: true, min: MIN_BLOCK_WEEKS, max: MAX_BLOCK_WEEKS },
    status: { type: String, enum: PLAN_STATUS_IDS, required: true, default: DEFAULT_PLAN_STATUS },
    deloadLastWeek: { type: Boolean, default: false },
    endingNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

planBlockSchema.index({ coachingId: 1, startWeek: 1 });
// The lazy "ends this week" check: her published blocks not announced yet.
planBlockSchema.index({ coachId: 1, status: 1, endingNotifiedAt: 1 });

export const PlanBlock = model<PlanBlockDocument>('PlanBlock', planBlockSchema);
