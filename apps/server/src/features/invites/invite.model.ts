import { Schema, Types, model } from 'mongoose';
import type { InviteType } from '@sistem/types';
import { SHORT_CODE_PATTERN } from './invite.constants';

// /join/<code>. The code is random and url-safe (never derived from a name). A coaching invite starts a
// Coaching and joins the coach's primary community; a community invite only adds a Membership.

export const INVITE_TYPE_IDS = ['coaching', 'community'] as const;

export interface InviteDocument {
  code: string;
  /** Her permanent coaching link only: the 6-character code she can read out (regenerate = a new one). */
  shortCode: string | null;
  coachId: Types.ObjectId;
  type: InviteType;
  communityId: Types.ObjectId | null;
  /** The coach's one permanent coaching link (regenerate = revoke + new). */
  permanent: boolean;
  /** A personal link may be limited to one email (checked against the account that redeems it). */
  targetEmail: string | null;
  maxUses: number | null;
  uses: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new Schema<InviteDocument>(
  {
    code: { type: String, required: true, unique: true, match: /^[A-Za-z0-9_-]{16,64}$/ },
    shortCode: { type: String, default: null, match: SHORT_CODE_PATTERN },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: INVITE_TYPE_IDS, required: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
    permanent: { type: Boolean, required: true, default: false },
    targetEmail: { type: String, lowercase: true, trim: true, default: null },
    maxUses: { type: Number, min: 1, default: null },
    uses: { type: Number, min: 0, required: true, default: 0 },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

inviteSchema.pre('validate', function requireCommunity() {
  if (this.type === 'community' && !this.communityId) this.invalidate('communityId', 'A community invite needs its community.');
});

inviteSchema.index({ coachId: 1, revokedAt: 1, createdAt: -1 });
inviteSchema.index({ shortCode: 1 }, { unique: true, partialFilterExpression: { shortCode: { $type: 'string' } } });

export const Invite = model<InviteDocument>('Invite', inviteSchema);
