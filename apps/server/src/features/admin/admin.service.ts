import type { Types } from 'mongoose';
import type { AdminCoach, CoachPasswordLinkResponse, CoachProfileStatus } from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { User } from '../users/user.model';
import { CoachProfile } from '../coachProfiles/coachProfile.model';
import type { CoachProfileDocument } from '../coachProfiles/coachProfile.model';
import { ensureCoachSetup } from '../coachProfiles/coachProfile.service';
import { Coaching } from '../coachings/coaching.model';
import { issueSetPasswordLink } from '../auth/auth.service';
import { sendSetPasswordEmail } from '../auth/email.service';
import { resolveLanguage } from '../users/units';
import { SET_PASSWORD_LINK_HOURS } from './admin.constants';

// The platform admin manages COACH accounts only. Nothing here reads trainees' private data
// (plans, logs, answers, body, photos) — only counts.

type LeanProfile = CoachProfileDocument & { _id: Types.ObjectId };

export class CoachEmailTakenError extends LocalizedError {}
export class CoachNotFoundError extends LocalizedError {}

async function toAdminCoaches(profiles: LeanProfile[]): Promise<AdminCoach[]> {
  const userIds = profiles.map((profile) => profile.userId);
  const [users, counts] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('name email passwordHash').lean(),
    Coaching.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { coachId: { $in: userIds }, live: true } },
      { $group: { _id: '$coachId', count: { $sum: 1 } } },
    ]),
  ]);
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const countBy = new Map(counts.map((entry) => [String(entry._id), entry.count]));
  return profiles.flatMap((profile) => {
    const user = byId.get(String(profile.userId));
    if (!user) return [];
    return [{
      id: String(profile._id),
      userId: String(user._id),
      name: profile.displayName,
      email: user.email,
      slug: profile.slug,
      status: profile.status,
      passwordSet: Boolean(user.passwordHash),
      traineeCount: countBy.get(String(user._id)) ?? 0,
      createdAt: profile.createdAt.toISOString(),
    }];
  });
}

export async function listCoaches(): Promise<AdminCoach[]> {
  return toAdminCoaches(await CoachProfile.find().sort({ createdAt: -1 }).lean<LeanProfile[]>());
}

async function findProfile(profileId: string): Promise<LeanProfile> {
  const profile = await CoachProfile.findById(profileId).lean<LeanProfile>();
  if (!profile) throw new CoachNotFoundError('coach_not_found');
  return profile;
}

/** A link to copy (shown once), and the same link by email when Resend is configured. */
async function passwordLink(profile: LeanProfile): Promise<CoachPasswordLinkResponse> {
  const user = await User.findById(profile.userId).select('email preferences').lean();
  if (!user) throw new CoachNotFoundError('coach_not_found');
  const { url, expiresAt } = await issueSetPasswordLink(String(profile.userId), SET_PASSWORD_LINK_HOURS * 60 * 60 * 1000);
  let emailSent = false;
  try {
    emailSent = await sendSetPasswordEmail(user.email, url, SET_PASSWORD_LINK_HOURS, resolveLanguage(user.preferences));
  } catch (error) {
    console.error('Failed to send the set-password email:', error);
  }
  const [coach] = await toAdminCoaches([profile]);
  return { coach, setPasswordUrl: url, expiresAt: expiresAt.toISOString(), emailSent };
}

/**
 * New coach: the account (no password), her profile, her primary community, and a one-time
 * set-password link. An email that already has an account is refused (never silently promoted).
 */
export async function createCoach(adminId: string, name: string, email: string): Promise<CoachPasswordLinkResponse> {
  if (await User.exists({ email })) throw new CoachEmailTakenError('coach_email_taken');
  let user;
  try {
    user = await User.create({ name, email, roles: ['coach'], passwordHash: null });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new CoachEmailTakenError('coach_email_taken');
    throw error;
  }
  const profile = await ensureCoachSetup(user._id, name, adminId);
  return passwordLink(profile);
}

/** A fresh link (the previous one stops working). */
export async function resendPasswordLink(profileId: string): Promise<CoachPasswordLinkResponse> {
  return passwordLink(await findProfile(profileId));
}

/**
 * Suspend: every coach route answers 403 and her invite links stop working; her trainees and all
 * data stay as they are. Reactivate restores both.
 */
export async function setCoachStatus(profileId: string, status: CoachProfileStatus): Promise<AdminCoach> {
  const profile = await CoachProfile.findByIdAndUpdate(profileId, { $set: { status } }, { returnDocument: 'after' }).lean<LeanProfile>();
  if (!profile) throw new CoachNotFoundError('coach_not_found');
  const [coach] = await toAdminCoaches([profile]);
  return coach;
}
