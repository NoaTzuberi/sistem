import crypto from 'crypto';
import type { Types } from 'mongoose';
import type { MyCommunity } from '@sistem/types';
import { Community, Membership } from './community.model';
import type { CommunityDocument } from './community.model';

// Communities hold people, never private data: nothing here reads plans, logs or body data.

type Id = Types.ObjectId | string;

function communitySlug(base: string): string {
  return `${base}-${crypto.randomBytes(3).toString('hex')}`.slice(0, 70);
}

/** Idempotent: the coach's primary community (made once, she is its owner). */
export async function ensurePrimaryCommunity(coachId: Id, coachSlug: string, name: string): Promise<CommunityDocument & { _id: Types.ObjectId }> {
  const existing = await Community.findOne({ coachId, isPrimary: true }).lean<CommunityDocument & { _id: Types.ObjectId }>();
  if (existing) return existing;
  try {
    const community = await Community.create({ coachId, name, slug: communitySlug(coachSlug), isPrimary: true });
    await joinCommunity(coachId, community._id, 'owner');
    return community.toObject();
  } catch (error) {
    // Two starts raced (the partial unique index): the other one made it.
    const raced = await Community.findOne({ coachId, isPrimary: true }).lean<CommunityDocument & { _id: Types.ObjectId }>();
    if (raced) return raced;
    throw error;
  }
}

export async function getPrimaryCommunityId(coachId: Id): Promise<Types.ObjectId | null> {
  const community = await Community.findOne({ coachId, isPrimary: true }).select('_id').lean();
  return community?._id ?? null;
}

/** True when this made her a member now (new, or back after leaving). */
export async function joinCommunity(userId: Id, communityId: Id, role: 'member' | 'owner' = 'member'): Promise<boolean> {
  const result = await Membership.updateOne(
    { communityId, userId, status: { $ne: 'active' } },
    { $set: { status: 'active', role, joinedAt: new Date() } },
    { upsert: false },
  );
  if (result.modifiedCount > 0) return true;
  try {
    await Membership.create({ communityId, userId, role });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false; // already an active member
    throw error;
  }
}

export async function isCommunityMember(userId: Id, communityId: Id): Promise<boolean> {
  return (await Membership.exists({ userId, communityId, status: 'active' })) !== null;
}

export async function listMyCommunities(userId: Id): Promise<MyCommunity[]> {
  const memberships = await Membership.find({ userId, status: 'active' }).sort({ joinedAt: 1 }).lean();
  if (memberships.length === 0) return [];
  const communities = await Community.find({ _id: { $in: memberships.map((m) => m.communityId) } }).lean();
  const byId = new Map(communities.map((c) => [String(c._id), c]));
  return memberships.flatMap((membership) => {
    const community = byId.get(String(membership.communityId));
    return community ? [{ id: String(community._id), name: community.name, isPrimary: community.isPrimary, role: membership.role }] : [];
  });
}

/** Her community names grouped by the coach who owns them (Profile coach card). */
export async function myCommunityNamesByCoach(userId: Id): Promise<Map<string, string[]>> {
  const memberships = await Membership.find({ userId, status: 'active' }).sort({ joinedAt: 1 }).select('communityId').lean();
  const communities = await Community.find({ _id: { $in: memberships.map((m) => m.communityId) } }).select('coachId name').lean();
  const byCoach = new Map<string, string[]>();
  for (const community of communities) {
    const key = String(community.coachId);
    byCoach.set(key, [...(byCoach.get(key) ?? []), community.name]);
  }
  return byCoach;
}

/** The coach's primary community name (what a trainee joins with the coaching), or null. */
export async function getPrimaryCommunityName(coachId: Id): Promise<string | null> {
  return (await Community.findOne({ coachId, isPrimary: true }).select('name').lean())?.name ?? null;
}
