import { Schema, Types, model } from 'mongoose';
import type { CommunityVisibility, MembershipRole } from '@sistem/types';

// A coach's community (PRD §15). Membership NEVER grants access to private data: the community
// context may expose only display name, profile photo and public achievements. Feed / challenges: later.

export const COMMUNITY_VISIBILITY_IDS = ['invite', 'public'] as const;
export const MEMBERSHIP_ROLE_IDS = ['member', 'owner'] as const;
export const MEMBERSHIP_STATUS_IDS = ['active', 'left'] as const;

export interface CommunityDocument {
  coachId: Types.ObjectId;
  name: string;
  slug: string;
  visibility: CommunityVisibility;
  /** Every coach has exactly one primary community; a coaching invite also joins it. */
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const communitySchema = new Schema<CommunityDocument>(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]{3,70}$/ },
    visibility: { type: String, enum: COMMUNITY_VISIBILITY_IDS, required: true, default: 'invite' },
    isPrimary: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

communitySchema.index({ coachId: 1, isPrimary: 1 });
communitySchema.index({ coachId: 1 }, { unique: true, partialFilterExpression: { isPrimary: true }, name: 'one_primary_per_coach' });

export const Community = model<CommunityDocument>('Community', communitySchema);

export interface MembershipDocument {
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MembershipRole;
  status: 'active' | 'left';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<MembershipDocument>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: MEMBERSHIP_ROLE_IDS, required: true, default: 'member' },
    status: { type: String, enum: MEMBERSHIP_STATUS_IDS, required: true, default: 'active' },
    joinedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

// One row per person per community (leaving flips status; re-joining flips it back).
membershipSchema.index({ communityId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, status: 1 });

export const Membership = model<MembershipDocument>('Membership', membershipSchema);
