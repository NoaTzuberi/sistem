import crypto from 'crypto';
import type { Types } from 'mongoose';
import { User } from '../users/user.model';
import { CoachProfile } from './coachProfile.model';
import type { CoachProfileDocument } from './coachProfile.model';
import { ensurePrimaryCommunity } from '../communities/community.service';
import { toPublicAvatar } from '../users/avatar';
import type { CoachPayment, CoachSendDefault, CoachSendDefaults, PrivatePhoto } from '@sistem/types';

type Id = Types.ObjectId | string;

/** Latin letters / digits from the name + a random tail (Hebrew names give just the tail). */
export function makeCoachSlug(name: string): string {
  const base = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'coach'}-${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Idempotent: the profile + primary community every coach account needs (admin create, the
 * accounts migration, dev seeds). Never changes an existing profile.
 */
export async function ensureCoachSetup(
  userId: Id,
  displayName: string,
  createdBy: Id | null = null,
): Promise<CoachProfileDocument & { _id: Types.ObjectId }> {
  let profile = await CoachProfile.findOne({ userId }).lean<CoachProfileDocument & { _id: Types.ObjectId }>();
  if (!profile) {
    try {
      profile = (await CoachProfile.create({ userId, displayName, slug: makeCoachSlug(displayName), createdBy })).toObject();
    } catch (error) {
      profile = await CoachProfile.findOne({ userId }).lean<CoachProfileDocument & { _id: Types.ObjectId }>();
      if (!profile) throw error;
    }
  }
  await ensurePrimaryCommunity(userId, profile.slug, profile.displayName);
  return profile;
}

export async function isCoachActive(userId: Id): Promise<boolean> {
  return (await CoachProfile.exists({ userId, status: 'active' })) !== null;
}

/** Display names by coach user id: the profile's name, else the account name. */
export async function getCoachNames(coachIds: Id[]): Promise<Map<string, string>> {
  const ids = [...new Set(coachIds.map(String))];
  const [profiles, users] = await Promise.all([
    CoachProfile.find({ userId: { $in: ids } }).select('userId displayName').lean(),
    User.find({ _id: { $in: ids } }).select('name').lean(),
  ]);
  const names = new Map(users.map((user) => [String(user._id), user.name]));
  for (const profile of profiles) names.set(String(profile.userId), profile.displayName);
  return names;
}

export async function getCoachName(coachId: Id): Promise<string> {
  return (await getCoachNames([coachId])).get(String(coachId)) ?? '';
}

// ---------------------------------------------------------------------------
// Payment links (temporary, until real payments — the app never processes or records a payment)
// ---------------------------------------------------------------------------

const EMPTY_PAYMENT: CoachPayment = { payboxUrl: null, bitPhone: null, note: null };

function toPayment(stored: CoachProfileDocument['payment']): CoachPayment {
  return { payboxUrl: stored?.payboxUrl ?? null, bitPhone: stored?.bitPhone ?? null, note: stored?.note ?? null };
}

export function hasAnyPayment(payment: CoachPayment): boolean {
  return Boolean(payment.payboxUrl || payment.bitPhone || payment.note);
}

export async function getCoachPayment(coachId: Id): Promise<CoachPayment> {
  const profile = await CoachProfile.findOne({ userId: coachId }).select('payment').lean();
  return profile ? toPayment(profile.payment) : { ...EMPTY_PAYMENT };
}

/** Only the fields sent change (already validated + normalized by parseCoachPaymentPayload). */
export async function updateCoachPayment(coachId: Id, changes: Partial<CoachPayment>): Promise<CoachPayment> {
  const next = { ...(await getCoachPayment(coachId)), ...changes };
  await CoachProfile.updateOne({ userId: coachId }, { $set: { payment: next } });
  return next;
}

// ---------------------------------------------------------------------------
// Her saved defaults for sending a plan (message + tip). What a trainee received stays on the
// published version — changing a default never rewrites it.
// ---------------------------------------------------------------------------

function toSendDefaults(stored: CoachProfileDocument['defaults']): CoachSendDefaults {
  const nutrition = stored?.nutrition;
  return { nutrition: { message: nutrition?.message ?? null, tip: nutrition?.tip ?? null } };
}

export async function getCoachSendDefaults(coachId: Id): Promise<CoachSendDefaults> {
  const profile = await CoachProfile.findOne({ userId: coachId }).select('defaults').lean();
  return toSendDefaults(profile?.defaults);
}

/** Only the fields sent change (already trimmed + checked by parseCoachDefaultsPayload). */
export async function updateCoachSendDefaults(
  coachId: Id,
  changes: { nutrition?: Partial<CoachSendDefault> },
): Promise<CoachSendDefaults> {
  const current = await getCoachSendDefaults(coachId);
  const next: CoachSendDefaults = { nutrition: { ...current.nutrition, ...changes.nutrition } };
  await CoachProfile.updateOne({ userId: coachId }, { $set: { defaults: next } });
  return next;
}

// ---------------------------------------------------------------------------
// The coach as a trainee sees her (confirm screen, Profile coach card)
// ---------------------------------------------------------------------------

export interface CoachCard {
  name: string;
  avatar: PrivatePhoto | null;
  payment: CoachPayment | null;
}

/** Name, photo and payment links per coach id. Callers decide who may see the payment part. */
export async function getCoachCards(coachIds: Id[]): Promise<Map<string, CoachCard>> {
  const ids = [...new Set(coachIds.map(String))];
  const [profiles, users] = await Promise.all([
    CoachProfile.find({ userId: { $in: ids } }).select('userId displayName payment').lean(),
    User.find({ _id: { $in: ids } }).select('name avatar').lean(),
  ]);
  const profileByUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  const cards = new Map<string, CoachCard>();
  for (const user of users) {
    const profile = profileByUser.get(String(user._id));
    const payment = toPayment(profile?.payment);
    cards.set(String(user._id), {
      name: profile?.displayName ?? user.name,
      avatar: toPublicAvatar(user.avatar),
      payment: hasAnyPayment(payment) ? payment : null,
    });
  }
  return cards;
}
