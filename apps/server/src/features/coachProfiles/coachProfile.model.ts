import { Schema, Types, model } from 'mongoose';
import type { CoachProfileStatus } from '@sistem/types';

// One per coach account (created by the admin). Phase 16a adds photo / cover / bio here.
export const COACH_PROFILE_STATUS_IDS = ['active', 'suspended'] as const;

export interface CoachProfileDocument {
  userId: Types.ObjectId;
  displayName: string;
  /** Unique, url-safe. Join links use the random invite code, never the slug (not guessable). */
  slug: string;
  status: CoachProfileStatus;
  /** The admin who created her; null for coaches that existed before admins. */
  createdBy: Types.ObjectId | null;
  /** Temporary payment links shown to her own trainees (validated in coachPayment.validation.ts). */
  payment?: { payboxUrl: string | null; bitPhone: string | null; note: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}

const coachProfileSchema = new Schema<CoachProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]{3,60}$/ },
    status: { type: String, enum: COACH_PROFILE_STATUS_IDS, required: true, default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    payment: {
      type: new Schema(
        {
          payboxUrl: { type: String, default: null, maxlength: 300 },
          bitPhone: { type: String, default: null, match: /^05\d{8}$/ },
          note: { type: String, default: null, maxlength: 140 },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

coachProfileSchema.index({ status: 1, createdAt: -1 });

export const CoachProfile = model<CoachProfileDocument>('CoachProfile', coachProfileSchema);
