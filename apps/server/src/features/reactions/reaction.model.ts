import { Schema, model, type Types } from 'mongoose';
import type { ReactionId, ReactionTargetType } from '@sistem/types';
import { REACTION_IDS, REACTION_TARGET_TYPES } from './reaction.constants';

export interface ReactionDocument {
  coachId: Types.ObjectId;
  coachingId: Types.ObjectId;
  traineeId: Types.ObjectId;
  targetType: ReactionTargetType;
  /** A log id, or her date for a day of photos. */
  targetId: string;
  reaction: ReactionId;
  /** When she saw it (Home's notice); null = new. A changed reaction is new again. */
  seenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// The coach's reaction on a feed item (coach mode Phase B). One per coach per target: changing it
// replaces it, removing it deletes the row.
const reactionSchema = new Schema<ReactionDocument>(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachingId: { type: Schema.Types.ObjectId, ref: 'Coaching', required: true },
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REACTION_TARGET_TYPES, required: true },
    targetId: { type: String, required: true },
    reaction: { type: String, enum: REACTION_IDS, required: true },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reactionSchema.index({ coachId: 1, traineeId: 1, targetType: 1, targetId: 1 }, { unique: true });
reactionSchema.index({ traineeId: 1, updatedAt: -1 });

export const Reaction = model<ReactionDocument>('Reaction', reactionSchema);
