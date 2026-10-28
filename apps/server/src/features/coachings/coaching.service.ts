import type { Types } from 'mongoose';
import type { MyCoaching } from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { Coaching } from './coaching.model';
import type { CoachingDocument } from './coaching.model';
import { isMultiCoachEnabled } from './coaching.config';
import { getCoachCards, getCoachName } from '../coachProfiles/coachProfile.service';
import { myCommunityNamesByCoach } from '../communities/community.service';

// THE place that answers "which coach(es) does this trainee have" — nothing reads a coach id from
// the User any more. Every coach-owned record carries the coachingId it belongs to.

type Id = Types.ObjectId | string;
export type LeanCoaching = CoachingDocument & { _id: Types.ObjectId };

/** Thrown when multi-coach is off and she already has a live coaching with another coach. */
export class OtherCoachError extends LocalizedError {
  constructor(readonly otherCoachName: string) {
    super('invite_other_coach', { coach: otherCoachName });
  }
}

export async function findLiveCoaching(traineeId: Id, coachId: Id): Promise<LeanCoaching | null> {
  return Coaching.findOne({ traineeId, coachId, live: true }).lean<LeanCoaching>();
}

/** Her live coachings, newest first. */
export async function listLiveCoachings(traineeId: Id): Promise<LeanCoaching[]> {
  return Coaching.find({ traineeId, live: true }).sort({ startedAt: -1 }).lean<LeanCoaching[]>();
}

/**
 * The coaching the single-coach apps show: her newest live one. (Multi-coach UI will pass a
 * coachingId explicitly instead — see the report's "where the UI changes".)
 */
export async function getCurrentCoaching(traineeId: Id): Promise<LeanCoaching | null> {
  return Coaching.findOne({ traineeId, live: true }).sort({ startedAt: -1 }).lean<LeanCoaching>();
}

/** Ids of her live coachings — or of every coaching she ever had (history screens). */
export async function coachingIdsOf(traineeId: Id, { includeEnded = false } = {}): Promise<Types.ObjectId[]> {
  const coachings = await Coaching.find(includeEnded ? { traineeId } : { traineeId, live: true }).select('_id').lean();
  return coachings.map((coaching) => coaching._id);
}

/** A coaching of HERS (any status), or null — for a coachingId sent by the trainee app. */
export async function findOwnCoaching(traineeId: Id, coachingId: string): Promise<LeanCoaching | null> {
  return Coaching.findOne({ _id: coachingId, traineeId }).lean<LeanCoaching>();
}

/** The coach's live coachings (the dashboard's trainee list), newest first. */
export async function listCoachCoachings(coachId: Id): Promise<LeanCoaching[]> {
  return Coaching.find({ coachId, live: true }).sort({ startedAt: -1 }).lean<LeanCoaching[]>();
}

export interface StartCoachingResult {
  coaching: LeanCoaching;
  /** False when she already had a live coaching with this coach (nothing new was made). */
  created: boolean;
}

/**
 * Starts a coaching (status 'waiting'). Same coach again → the existing one. Another coach while
 * MULTI_COACH_ENABLED is off → OtherCoachError (never switches silently).
 */
export async function startCoaching(traineeId: Id, coachId: Id, discipline: string | null = null): Promise<StartCoachingResult> {
  const existing = await findLiveCoaching(traineeId, coachId);
  if (existing) return { coaching: existing, created: false };

  if (!isMultiCoachEnabled()) {
    const other = await getCurrentCoaching(traineeId);
    if (other) throw new OtherCoachError(await getCoachName(other.coachId));
  }

  try {
    const coaching = await Coaching.create({ traineeId, coachId, status: 'waiting', discipline });
    return { coaching: coaching.toObject() as LeanCoaching, created: true };
  } catch (error) {
    // The same pair raced (one_live_per_pair): use the one that won.
    const raced = await findLiveCoaching(traineeId, coachId);
    if (raced) return { coaching: raced, created: false };
    throw error;
  }
}

/** waiting → active when the coach publishes her first plan (no-op otherwise). */
export async function markCoachingActive(coachingId: Id): Promise<void> {
  await Coaching.updateOne({ _id: coachingId, status: 'waiting' }, { $set: { status: 'active' } });
}

/** Ends a coaching; every record linked to it stays (history). False when it was not live any more. */
export async function endCoaching(coachingId: Id, now: Date = new Date()): Promise<boolean> {
  const result = await Coaching.updateOne({ _id: coachingId, live: true }, { $set: { status: 'ended', live: false, endedAt: now } });
  return result.modifiedCount === 1;
}

/**
 * Her live (waiting / active) coachings for the Profile coach card. The payment links of a coach are
 * sent only here — i.e. only to trainees with a live coaching with that coach.
 */
export async function listMyCoachings(traineeId: Id): Promise<MyCoaching[]> {
  const coachings = await listLiveCoachings(traineeId);
  const [cards, communities] = await Promise.all([
    getCoachCards(coachings.map((coaching) => coaching.coachId)),
    myCommunityNamesByCoach(traineeId),
  ]);
  return coachings.map((coaching) => {
    const card = cards.get(String(coaching.coachId));
    return {
      id: String(coaching._id),
      coachId: String(coaching.coachId),
      coachName: card?.name ?? '',
      status: coaching.status,
      discipline: coaching.discipline ?? null,
      startedAt: coaching.startedAt.toISOString(),
      coachAvatar: card?.avatar ?? null,
      communityNames: communities.get(String(coaching.coachId)) ?? [],
      payment: card?.payment ?? null,
    };
  });
}

/**
 * The coaching a coach-owned record belongs to, from its trainee + coach: the live one, else the
 * newest ended one (history). Used by the model fallbacks and the migration.
 */
export async function resolveCoachingId(traineeId: Id, coachId: Id): Promise<Types.ObjectId | null> {
  const coaching = await Coaching.findOne({ traineeId, coachId }).sort({ live: -1, startedAt: -1 }).select('_id').lean();
  return coaching?._id ?? null;
}

export class CoachingNotFoundError extends LocalizedError {}

/**
 * The trainee app's optional `?coachingId=` (hooks are coaching-aware for the future multi-coach
 * UI): null when not sent, the id when it is one of HER coachings, else CoachingNotFoundError.
 */
export async function readTraineeCoachingParam(traineeId: Id, value: unknown): Promise<string | null> {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) throw new CoachingNotFoundError('not_found');
  if (!(await findOwnCoaching(traineeId, value))) throw new CoachingNotFoundError('not_found');
  return value;
}

/**
 * Where the coach's 48h window starts: when BOTH her onboarding is done and she is with the coach
 * (an onboarded trainee joining later gets a fresh window). Null while onboarding is unfinished.
 */
export function planWindowStart(onboardingCompletedAt: Date | null, coachingStartedAt: Date | null): Date | null {
  if (!onboardingCompletedAt) return null;
  if (!coachingStartedAt) return onboardingCompletedAt;
  return coachingStartedAt > onboardingCompletedAt ? coachingStartedAt : onboardingCompletedAt;
}
