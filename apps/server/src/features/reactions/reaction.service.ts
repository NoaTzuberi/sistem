import { Types } from 'mongoose';
import type { CoachReaction, CoachReactionList, ReactionId, ReactionTargetType, SetReactionPayload } from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { Coaching } from '../coachings/coaching.model';
import { coachingIdsOf } from '../coachings/coaching.service';
import { getCoachNames } from '../coachProfiles/coachProfile.service';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { CardioLog } from '../cardio/cardio.model';
import { MealLog } from '../mealLogs/mealLog.model';
import { BodyMetric } from '../bodyMetrics/bodyMetric.model';
import { Reaction } from './reaction.model';
import { REACTION_LIST_LIMIT, REACTION_LOOKBACK_DAYS } from './reaction.constants';

export class ReactionTargetNotFoundError extends LocalizedError {}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Is the target hers and inside this coaching — the same scope as the feed: logs of this coaching,
 * or her own (free) logs since she joined; her photo days (trainee-owned, she shares them with her coach).
 */
async function targetExists(traineeId: string, coachingId: string, type: ReactionTargetType, id: string): Promise<boolean> {
  const coaching = await Coaching.findById(coachingId).select('startedAt').lean();
  if (!coaching) return false;
  const inCoaching = (dateField: string) => ({
    $or: [{ coachingId: new Types.ObjectId(coachingId) }, { coachingId: null, [dateField]: { $gte: coaching.startedAt } }],
  });
  switch (type) {
    case 'workout_log':
      return Boolean(await WorkoutLog.exists({ _id: id, traineeId, status: 'completed', ...inCoaching('finishedAt') }));
    case 'pump_photo':
      return Boolean(await WorkoutLog.exists({ _id: id, traineeId, status: 'completed', pumpPhoto: { $ne: null }, ...inCoaching('finishedAt') }));
    case 'cardio_log':
      return Boolean(await CardioLog.exists({ _id: id, traineeId, ...inCoaching('createdAt') }));
    case 'meal_photos':
      return Boolean(await MealLog.exists({ traineeId, date: id, 'photos.0': { $exists: true } }));
    case 'progress_photos':
      return Boolean(await BodyMetric.exists({ traineeId, date: id, 'photos.0': { $exists: true } }));
  }
}

/** PUT /coach/trainees/:traineeId/reactions — set, change or (null) remove the coach's one reaction. */
export async function setCoachReaction(
  coachId: string,
  traineeId: string,
  coachingId: string,
  { targetType, targetId, reaction }: SetReactionPayload,
): Promise<ReactionId | null> {
  const key = { coachId, traineeId, targetType, targetId };
  if (reaction === null) {
    await Reaction.deleteOne(key);
    return null;
  }
  if (!(await targetExists(traineeId, coachingId, targetType, targetId))) throw new ReactionTargetNotFoundError('reaction_target_not_found');
  // A new or changed reaction is new to her again (Home's notice).
  await Reaction.updateOne(key, { $set: { reaction, coachingId, seenAt: null } }, { upsert: true });
  return reaction;
}

export interface ReactionTargetRef {
  traineeId: string;
  type: ReactionTargetType;
  id: string;
}

const refKey = (ref: ReactionTargetRef) => `${ref.traineeId}|${ref.type}|${ref.id}`;

/** The coach's reactions on these targets (the feed page), keyed by trainee|type|id. */
export async function coachReactionsFor(coachId: string, refs: ReactionTargetRef[]): Promise<Map<string, ReactionId>> {
  if (refs.length === 0) return new Map();
  const rows = await Reaction.find({
    coachId,
    $or: refs.map((ref) => ({ traineeId: ref.traineeId, targetType: ref.type, targetId: ref.id })),
  })
    .select('traineeId targetType targetId reaction')
    .lean();
  return new Map(rows.map((row) => [refKey({ traineeId: String(row.traineeId), type: row.targetType, id: row.targetId }), row.reaction]));
}

export function reactionKeyOf(ref: ReactionTargetRef): string {
  return refKey(ref);
}

/**
 * GET /reactions (trainee): her coaches' reactions, newest first — the last REACTION_LOOKBACK_DAYS
 * (Home's notice), or every one on one log (?logId=). Live coachings only.
 */
export async function listMyReactions(traineeId: string, { logId }: { logId?: string }, now: Date = new Date()): Promise<CoachReactionList> {
  const coachingIds = await coachingIdsOf(traineeId);
  const filter: Record<string, unknown> = { traineeId, coachingId: { $in: coachingIds } };
  if (logId) {
    filter.targetId = logId;
    filter.targetType = { $in: ['workout_log', 'pump_photo', 'cardio_log'] };
  } else {
    filter.updatedAt = { $gte: new Date(now.getTime() - REACTION_LOOKBACK_DAYS * DAY_MS) };
  }
  const rows = coachingIds.length === 0 ? [] : await Reaction.find(filter).sort({ updatedAt: -1 }).limit(REACTION_LIST_LIMIT).lean();

  const workoutIds = rows.filter((row) => row.targetType === 'workout_log' || row.targetType === 'pump_photo').map((row) => row.targetId);
  const cardioIds = rows.filter((row) => row.targetType === 'cardio_log').map((row) => row.targetId);
  const [workouts, cardio, names] = await Promise.all([
    workoutIds.length ? WorkoutLog.find({ _id: { $in: workoutIds }, traineeId }).select('workoutTitle').lean() : [],
    cardioIds.length ? CardioLog.find({ _id: { $in: cardioIds }, traineeId }).select('workoutTitle').lean() : [],
    getCoachNames(rows.map((row) => row.coachId)),
  ]);
  const titles = new Map([...workouts, ...cardio].map((log) => [String(log._id), log.workoutTitle]));

  const items: CoachReaction[] = rows.map((row) => ({
    id: String(row._id),
    reaction: row.reaction,
    targetType: row.targetType,
    targetId: row.targetId,
    workoutTitle: titles.get(row.targetId) ?? null,
    logId: row.targetType === 'workout_log' || row.targetType === 'pump_photo' ? row.targetId : null,
    coachName: names.get(String(row.coachId)) ?? '',
    at: row.updatedAt.toISOString(),
    seen: row.seenAt !== null,
  }));
  return { items, serverTime: now.toISOString() };
}

/** POST /reactions/seen — everything new to her is seen now. */
export async function markMyReactionsSeen(traineeId: string, now: Date = new Date()): Promise<void> {
  await Reaction.updateMany({ traineeId, seenAt: null }, { $set: { seenAt: now } });
}
