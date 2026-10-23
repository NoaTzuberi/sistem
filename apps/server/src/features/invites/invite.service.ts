import crypto from 'crypto';
import type { Types } from 'mongoose';
import type { CoachInvite, CoachInvitesResponse, InviteProblem, InviteType, JoinPreview, JoinResult } from '@sistem/types';
import { config } from '../../config/env';
import { publicLink } from '../../config/publicUrls';
import { LocalizedError } from '../../i18n';
import type { MessageCode } from '../../i18n';
import { emitAppEvent } from '../../events/appEvents';
import { User, hasRole, isOnboardingCompleted } from '../users/user.model';
import { Community } from '../communities/community.model';
import { getPrimaryCommunityId, getPrimaryCommunityName, joinCommunity } from '../communities/community.service';
import { getCoachCards, getCoachName, isCoachActive } from '../coachProfiles/coachProfile.service';
import { findLiveCoaching, getCurrentCoaching, startCoaching } from '../coachings/coaching.service';
import { isMultiCoachEnabled } from '../coachings/coaching.config';
import { Invite } from './invite.model';
import type { InviteDocument } from './invite.model';
import {
  INVITE_CODE_BYTES,
  MAX_LISTED_PERSONAL_INVITES,
  PERSONAL_INVITE_TTL_DAYS,
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH,
  SHORT_CODE_PATTERN,
} from './invite.constants';

// /join/<code>. Codes are random (crypto), never derived from a name; every check runs on the server.

type LeanInvite = InviteDocument & { _id: Types.ObjectId };
type Id = Types.ObjectId | string;

const PROBLEM_CODES: Record<InviteProblem, MessageCode> = {
  invalid: 'invite_invalid',
  expired: 'invite_expired',
  revoked: 'invite_revoked',
  used_up: 'invite_used_up',
};

/** A code that can't be used (404 / 410 — the app shows one friendly screen). */
export class InviteProblemError extends LocalizedError {
  constructor(readonly problem: InviteProblem) {
    super(PROBLEM_CODES[problem]);
  }
}
/** 403: the link is for another email, or the account is not a trainee. */
export class InviteForbiddenError extends LocalizedError {}
export class InviteNotFoundError extends LocalizedError {}

export function newInviteCode(): string {
  return crypto.randomBytes(INVITE_CODE_BYTES).toString('base64url');
}

/** Unbiased: bytes ≥ the largest multiple of the alphabet size are skipped. */
export function newShortCode(): string {
  const limit = 256 - (256 % SHORT_CODE_ALPHABET.length);
  let code = '';
  while (code.length < SHORT_CODE_LENGTH) {
    for (const byte of crypto.randomBytes(SHORT_CODE_LENGTH * 2)) {
      if (byte < limit && code.length < SHORT_CODE_LENGTH) code += SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length];
    }
  }
  return code;
}

export function joinUrl(code: string): string {
  return publicLink(config.clientUrl, `/join/${encodeURIComponent(code)}`);
}

function toCoachInvite(invite: LeanInvite): CoachInvite {
  return {
    id: String(invite._id),
    code: invite.code,
    shortCode: invite.shortCode ?? null,
    url: joinUrl(invite.code),
    type: invite.type,
    targetEmail: invite.targetEmail ?? null,
    maxUses: invite.maxUses ?? null,
    uses: invite.uses,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Coach side
// ---------------------------------------------------------------------------

async function createInvite(fields: Omit<Partial<InviteDocument>, 'coachId'> & { coachId: Id; type: InviteType }): Promise<LeanInvite> {
  const created = await Invite.create({ ...fields, code: newInviteCode() });
  return created.toObject() as LeanInvite;
}

/** A free short code is written once; a clash (unique index) just tries another one. */
async function addShortCode(invite: LeanInvite): Promise<LeanInvite> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const updated = await Invite.findOneAndUpdate(
        { _id: invite._id, shortCode: null },
        { $set: { shortCode: newShortCode() } },
        { new: true },
      ).lean<LeanInvite>();
      return updated ?? ((await Invite.findById(invite._id).lean<LeanInvite>()) as LeanInvite);
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
  return invite;
}

/**
 * Her one permanent link of this type (made on first use). A community link points at her primary
 * community. The coaching link also carries her 6-character code (added to older links on first read).
 */
export async function ensurePermanentInvite(coachId: Id, type: InviteType = 'coaching'): Promise<LeanInvite> {
  let invite = await Invite.findOne({ coachId, type, permanent: true, revokedAt: null }).lean<LeanInvite>();
  if (!invite) {
    const communityId = type === 'community' ? await getPrimaryCommunityId(coachId) : null;
    invite = await createInvite({ coachId, type, permanent: true, communityId });
  }
  return type === 'coaching' && !invite.shortCode ? addShortCode(invite) : invite;
}

function isOpen(invite: LeanInvite, now: Date): boolean {
  if (invite.revokedAt) return false;
  if (invite.expiresAt && invite.expiresAt <= now) return false;
  return invite.maxUses == null || invite.uses < invite.maxUses;
}

export async function getCoachInvites(coachId: Id, now: Date = new Date()): Promise<CoachInvitesResponse> {
  const [permanent, personal] = await Promise.all([
    ensurePermanentInvite(coachId),
    Invite.find({ coachId, type: 'coaching', permanent: false, revokedAt: null })
      .sort({ createdAt: -1 })
      .limit(MAX_LISTED_PERSONAL_INVITES)
      .lean<LeanInvite[]>(),
  ]);
  return { permanent: toCoachInvite(permanent), personal: personal.filter((invite) => isOpen(invite, now)).map(toCoachInvite) };
}

/** A single-use coaching link, optionally for one email; it expires after PERSONAL_INVITE_TTL_DAYS. */
export async function createPersonalInvite(coachId: Id, targetEmail: string | null, now: Date = new Date()): Promise<CoachInvite> {
  const expiresAt = new Date(now.getTime() + PERSONAL_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return toCoachInvite(await createInvite({ coachId, type: 'coaching', permanent: false, targetEmail, maxUses: 1, expiresAt }));
}

/** Her community-only link (backend now; no dashboard UI yet). */
export async function getCommunityInvite(coachId: Id): Promise<CoachInvite> {
  return toCoachInvite(await ensurePermanentInvite(coachId, 'community'));
}

/** The old permanent link stops working; a new one replaces it. */
export async function regeneratePermanentInvite(coachId: Id, type: InviteType = 'coaching', now: Date = new Date()): Promise<CoachInvite> {
  await Invite.updateMany({ coachId, type, permanent: true, revokedAt: null }, { $set: { revokedAt: now } });
  return toCoachInvite(await ensurePermanentInvite(coachId, type));
}

/** Revokes one of HER links (another coach's id → not found). A permanent one is replaced at once. */
export async function revokeInvite(coachId: Id, inviteId: string, now: Date = new Date()): Promise<void> {
  const invite = await Invite.findOneAndUpdate({ _id: inviteId, coachId, revokedAt: null }, { $set: { revokedAt: now } }).lean<LeanInvite>();
  if (!invite) throw new InviteNotFoundError('not_found');
  if (invite.permanent) await ensurePermanentInvite(coachId, invite.type);
}

// ---------------------------------------------------------------------------
// Join
// ---------------------------------------------------------------------------

/** The invite behind a code, or InviteProblemError. A suspended coach's links stop working too. */
export async function resolveInvite(code: string, now: Date = new Date()): Promise<LeanInvite> {
  const short = code.toUpperCase();
  const isShort = SHORT_CODE_PATTERN.test(short);
  if (!isShort && !/^[A-Za-z0-9_-]{16,64}$/.test(code)) throw new InviteProblemError('invalid');
  // A short code of a regenerated link is gone (null on the new link, kept on the revoked one) → 'revoked'.
  const invite = await Invite.findOne(isShort ? { shortCode: short } : { code }).lean<LeanInvite>();
  if (!invite) throw new InviteProblemError('invalid');
  if (invite.revokedAt) throw new InviteProblemError('revoked');
  if (invite.expiresAt && invite.expiresAt <= now) throw new InviteProblemError('expired');
  if (invite.maxUses != null && invite.uses >= invite.maxUses) throw new InviteProblemError('used_up');
  if (!(await isCoachActive(invite.coachId))) throw new InviteProblemError('revoked');
  return invite;
}

function checkTargetEmail(invite: LeanInvite, email: string): void {
  if (invite.targetEmail && invite.targetEmail !== email.trim().toLowerCase()) {
    throw new InviteForbiddenError('invite_email_mismatch');
  }
}

async function communityName(invite: LeanInvite): Promise<string | null> {
  if (!invite.communityId) return null;
  return (await Community.findById(invite.communityId).select('name').lean())?.name ?? null;
}

/** What the /join screen shows: the coach, and what this viewer can do with the code. */
export async function previewInvite(code: string, viewerId: string | null): Promise<JoinPreview> {
  const invite = await resolveInvite(code);
  const [cards, community, primaryName] = await Promise.all([
    getCoachCards([invite.coachId]),
    communityName(invite),
    getPrimaryCommunityName(invite.coachId),
  ]);
  const card = cards.get(String(invite.coachId));
  const viewer = viewerId ? await User.findById(viewerId).select('email roles').lean() : null;
  const base = {
    code,
    type: invite.type,
    coachName: card?.name ?? '',
    communityName: community,
    // The photo is a private asset: only a signed-in viewer holding a valid code gets a link.
    coachAvatar: viewer ? (card?.avatar ?? null) : null,
    coachCommunityNames: invite.type === 'coaching' && primaryName ? [primaryName] : [],
    otherCoachName: null,
  };
  if (!viewer) return { ...base, action: 'sign_up' };
  if (!hasRole(viewer, 'trainee')) return { ...base, action: 'not_trainee' };
  checkTargetEmail(invite, viewer.email);
  if (invite.type === 'community') return { ...base, action: 'join_community' };

  if (await findLiveCoaching(viewerId!, invite.coachId)) return { ...base, action: 'already_hers' };
  const current = isMultiCoachEnabled() ? null : await getCurrentCoaching(viewerId!);
  if (current) return { ...base, action: 'other_coach', otherCoachName: await getCoachName(current.coachId) };
  return { ...base, action: 'join' };
}

/** Takes one use of a capped invite (atomic); false when it was used up in the meantime. */
async function takeUse(invite: LeanInvite): Promise<boolean> {
  const filter = invite.maxUses == null
    ? { _id: invite._id }
    : { _id: invite._id, revokedAt: null, $expr: { $lt: ['$uses', '$maxUses'] } };
  return (await Invite.updateOne(filter, { $inc: { uses: 1 } })).modifiedCount > 0;
}

async function giveBackUse(invite: LeanInvite): Promise<void> {
  await Invite.updateOne({ _id: invite._id, uses: { $gt: 0 } }, { $inc: { uses: -1 } });
}

/**
 * The signed-in trainee accepts a code. Coaching invite → a Coaching ('waiting') + her coach's primary
 * community; already with this coach → nothing new; with another coach and multi-coach off →
 * OtherCoachError (never switches silently). Community invite → membership only, never private access.
 */
export async function redeemInvite(userId: string, code: string): Promise<{ result: JoinResult; coachName: string }> {
  const user = await User.findById(userId).select('email roles onboardingStatus').lean();
  if (!user || !hasRole(user, 'trainee')) throw new InviteForbiddenError('invite_not_trainee');
  const invite = await resolveInvite(code);
  checkTargetEmail(invite, user.email);
  const coachName = await getCoachName(invite.coachId);

  if (invite.type === 'community') {
    if (!invite.communityId) throw new InviteProblemError('invalid');
    if (!(await takeUse(invite))) throw new InviteProblemError('used_up');
    const joined = await joinCommunity(userId, invite.communityId);
    if (!joined) await giveBackUse(invite);
    return { result: 'community_joined', coachName };
  }

  if (!(await takeUse(invite))) throw new InviteProblemError('used_up');
  let started: Awaited<ReturnType<typeof startCoaching>>;
  try {
    started = await startCoaching(userId, invite.coachId);
  } catch (error) {
    await giveBackUse(invite);
    throw error;
  }
  if (!started.created) await giveBackUse(invite);

  const primary = await getPrimaryCommunityId(invite.coachId);
  if (primary) await joinCommunity(userId, primary);

  // Already onboarded (she joined after finishing): the coach hears about her now, as she would have
  // at onboarding. Not onboarded yet: completing onboarding emits it.
  if (started.created && isOnboardingCompleted(user)) {
    emitAppEvent('trainee.onboarded', {
      traineeId: userId,
      coachId: String(invite.coachId),
      coachingId: String(started.coaching._id),
      completedAt: new Date(),
    });
  }
  return { result: started.created ? 'coaching_started' : 'already_hers', coachName };
}

/** Accepts a pasted /join link or a bare code ("no coach yet" screen). */
export function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/join\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : trimmed;
}
