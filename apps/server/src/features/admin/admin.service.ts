import type { Types } from 'mongoose';
import type { AdminCoach, AdminUser, AdminUserResetLinkResponse, CoachPasswordLinkResponse, CoachProfileStatus } from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { User } from '../users/user.model';
import { CoachProfile } from '../coachProfiles/coachProfile.model';
import type { CoachProfileDocument } from '../coachProfiles/coachProfile.model';
import { ensureCoachSetup } from '../coachProfiles/coachProfile.service';
import { Coaching } from '../coachings/coaching.model';
import { issuePasswordResetLink, issueResetLinkFor, issueSetPasswordLink } from '../auth/auth.service';
import { isTestEmail } from '../users/testEmail';
import { sendSetPasswordEmail } from '../auth/email.service';
import { resolveLanguage } from '../users/units';
import { SET_PASSWORD_LINK_HOURS } from './admin.constants';

// The platform admin manages COACH accounts, and finds any account by name / email for a reset link.
// Nothing here reads trainees' private data (plans, logs, answers, body, photos) — only identity and counts.

type LeanProfile = CoachProfileDocument & { _id: Types.ObjectId };

export class CoachEmailTakenError extends LocalizedError {}
export class CoachNotFoundError extends LocalizedError {}
export class AdminUserNotFoundError extends LocalizedError {}
/** Admin accounts are never reset from the page (create:admin --reset-password is the way). */
export class AdminTargetRefusedError extends LocalizedError {}
export class NotTestAccountError extends LocalizedError {}

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
  return { coach, kind: 'set_password', setPasswordUrl: url, expiresAt: expiresAt.toISOString(), emailSent };
}

/**
 * The fallback when email can't reach her (no provider in production yet): a dashboard reset link
 * for the admin to copy and pass on. Same rules as the emailed one (60 min, single use, cancels
 * older links, signs her other sessions out when used). Never emailed, never logged.
 */
export async function createResetLink(profileId: string): Promise<CoachPasswordLinkResponse> {
  const profile = await findProfile(profileId);
  const { url, expiresAt } = await issuePasswordResetLink(String(profile.userId));
  const [coach] = await toAdminCoaches([profile]);
  return { coach, kind: 'reset_password', setPasswordUrl: url, expiresAt: expiresAt.toISOString(), emailSent: false };
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

// ---------------------------------------------------------------------------
// Any account (2026-11-17): find one by name / email, give her a one-time reset link to pass on,
// and point a TEST account at a real inbox. Identity only (name, email, roles) — never her data.
// ---------------------------------------------------------------------------

const USER_SEARCH_LIMIT = 20;
type LeanUser = { _id: Types.ObjectId; name: string; email: string; roles: AdminUser['roles'] };

function toAdminUser(user: LeanUser): AdminUser {
  // `?? []` / `?? ''`: one odd record (an old account) must never fail the whole search.
  return { id: String(user._id), name: user.name ?? '', email: user.email, roles: [...(user.roles ?? [])], isTestAccount: isTestEmail(user.email) };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchUsers(query: string): Promise<AdminUser[]> {
  const pattern = new RegExp(escapeRegex(query), 'i');
  const users = await User.find({ $or: [{ email: pattern }, { name: pattern }] })
    .select('name email roles')
    .sort({ email: 1 })
    .limit(USER_SEARCH_LIMIT)
    .lean<LeanUser[]>();
  return users.map(toAdminUser);
}

async function findUser(userId: string): Promise<LeanUser> {
  const user = await User.findById(userId).select('name email roles').lean<LeanUser>();
  if (!user) throw new AdminUserNotFoundError('admin_user_not_found');
  return user;
}

/** 60 minutes, single use, cancels her older links; the link is in this answer only (never stored or logged). */
export async function createUserResetLink(userId: string): Promise<AdminUserResetLinkResponse> {
  const user = await findUser(userId);
  if ((user.roles ?? []).includes('admin')) throw new AdminTargetRefusedError('admin_user_is_admin');
  const { app, url, expiresAt } = await issueResetLinkFor(user);
  return { user: toAdminUser(user), app, url, expiresAt: expiresAt.toISOString() };
}

/**
 * Test accounts only (no real inbox): the new address may be anything not taken (e.g. a real +alias).
 * Her open reset / set-password link is cancelled (it was meant for the old address).
 */
export async function changeTestAccountEmail(userId: string, email: string): Promise<AdminUser> {
  const user = await findUser(userId);
  if (!isTestEmail(user.email)) throw new NotTestAccountError('admin_user_not_test_account');
  if (email !== user.email && (await User.exists({ email }))) throw new CoachEmailTakenError('coach_email_taken');
  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { email }, $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 } },
      { returnDocument: 'after' },
    )
      .select('name email roles')
      .lean<LeanUser>();
    if (!updated) throw new AdminUserNotFoundError('admin_user_not_found');
    return toAdminUser(updated);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new CoachEmailTakenError('coach_email_taken');
    throw error;
  }
}
