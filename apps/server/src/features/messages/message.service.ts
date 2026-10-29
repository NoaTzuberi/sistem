import type { Types } from 'mongoose';
import type { ChatMessage, CoachThread, CoachThreadList, MessagePage, MessageSender, TraineeThreadResponse } from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { User } from '../users/user.model';
import { toPublicAvatar } from '../users/avatar';
import { Coaching } from '../coachings/coaching.model';
import { getCurrentCoaching } from '../coachings/coaching.service';
import { getCoachNames } from '../coachProfiles/coachProfile.service';
import { Message, type MessageDocument } from './message.model';
import type { MessagePageQuery } from './message.validation';

export class NoCoachingError extends LocalizedError {}

type LeanMessage = MessageDocument & { _id: Types.ObjectId };

function toChatMessage(row: LeanMessage): ChatMessage {
  return {
    id: String(row._id),
    sender: row.sender,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

/** One page of a coaching's thread, newest first (one extra row says whether there is more). */
async function readPage(coachingId: string | Types.ObjectId, { before, limit }: MessagePageQuery, now: Date): Promise<MessagePage> {
  const filter: Record<string, unknown> = { coachingId };
  if (before) filter.createdAt = { $lt: before };
  const rows = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean<LeanMessage[]>();
  const page = rows.slice(0, limit);
  return {
    items: page.map(toChatMessage),
    nextBefore: rows.length > limit ? page[page.length - 1].createdAt.toISOString() : null,
    serverTime: now.toISOString(),
  };
}

async function send(coachingId: Types.ObjectId | string, coachId: Types.ObjectId | string, traineeId: Types.ObjectId | string, sender: MessageSender, text: string) {
  const created = await Message.create({ coachingId, coachId, traineeId, sender, text });
  return toChatMessage(created.toObject() as LeanMessage);
}

/** The other side's messages in this coaching become read; answers with the reader's unread count left. */
async function markRead(coachingId: Types.ObjectId | string, from: MessageSender, now: Date) {
  await Message.updateMany({ coachingId, sender: from, readAt: null }, { $set: { readAt: now } });
}

// --- Coach ------------------------------------------------------------------------------

/** Her unread messages from trainees of her LIVE coachings (the dock badge). */
export async function countCoachUnread(coachId: string): Promise<number> {
  const live = await Coaching.find({ coachId, live: true }).select('_id').lean();
  if (live.length === 0) return 0;
  return Message.countDocuments({ coachingId: { $in: live.map((row) => row._id) }, sender: 'trainee', readAt: null });
}

/** GET /coach/messages — one row per live coaching with messages, newest conversation first. */
export async function listCoachThreads(coachId: string, now: Date = new Date()): Promise<CoachThreadList> {
  const live = await Coaching.find({ coachId, live: true }).select('_id traineeId').lean();
  if (live.length === 0) return { items: [], unreadTotal: 0, serverTime: now.toISOString() };

  const grouped = await Message.aggregate<{ _id: Types.ObjectId; last: LeanMessage; unread: number }>([
    { $match: { coachingId: { $in: live.map((row) => row._id) } } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: '$coachingId',
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'trainee'] }, { $eq: ['$readAt', null] }] }, 1, 0] } },
      },
    },
    { $sort: { 'last.createdAt': -1 } },
  ]);
  const traineeOf = new Map(live.map((row) => [String(row._id), row.traineeId]));
  const users = await User.find({ _id: { $in: live.map((row) => row.traineeId) } }).select('name avatar').lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));

  const items: CoachThread[] = grouped.flatMap((group) => {
    const user = byId.get(String(traineeOf.get(String(group._id))));
    if (!user) return [];
    return [{ trainee: { id: String(user._id), name: user.name, avatar: toPublicAvatar(user.avatar) }, lastMessage: toChatMessage(group.last), unread: group.unread }];
  });
  return { items, unreadTotal: items.reduce((sum, item) => sum + item.unread, 0), serverTime: now.toISOString() };
}

/** GET /coach/trainees/:id/messages (after loadCoachTrainee: a live coaching of this coach). */
export function getCoachThreadPage(coachingId: string, query: MessagePageQuery, now: Date = new Date()): Promise<MessagePage> {
  return readPage(coachingId, query, now);
}

export function sendCoachMessage(coachId: string, traineeId: string, coachingId: string, text: string): Promise<ChatMessage> {
  return send(coachingId, coachId, traineeId, 'coach', text);
}

export async function markCoachThreadRead(coachId: string, coachingId: string, now: Date = new Date()): Promise<number> {
  await markRead(coachingId, 'trainee', now);
  return countCoachUnread(coachId);
}

// --- Trainee ----------------------------------------------------------------------------

/** Her unread messages from her current coach. */
export async function countTraineeUnread(traineeId: string): Promise<number> {
  const coaching = await getCurrentCoaching(traineeId);
  if (!coaching) return 0;
  return Message.countDocuments({ coachingId: coaching._id, sender: 'coach', readAt: null });
}

/** GET /messages — her thread with her current coach (single-coach apps: the newest live coaching). */
export async function getTraineeThread(traineeId: string, query: MessagePageQuery, now: Date = new Date()): Promise<TraineeThreadResponse> {
  const coaching = await getCurrentCoaching(traineeId);
  if (!coaching) return { coach: null, items: [], nextBefore: null, unread: 0, serverTime: now.toISOString() };
  const [page, names, coachUser, unread] = await Promise.all([
    readPage(coaching._id, query, now),
    getCoachNames([coaching.coachId]),
    User.findById(coaching.coachId).select('avatar').lean(),
    Message.countDocuments({ coachingId: coaching._id, sender: 'coach', readAt: null }),
  ]);
  return {
    ...page,
    coach: { id: String(coaching.coachId), name: names.get(String(coaching.coachId)) ?? '', avatar: toPublicAvatar(coachUser?.avatar) },
    unread,
  };
}

export async function sendTraineeMessage(traineeId: string, text: string): Promise<ChatMessage> {
  const coaching = await getCurrentCoaching(traineeId);
  if (!coaching) throw new NoCoachingError('message_no_coach');
  return send(coaching._id, coaching.coachId, traineeId, 'trainee', text);
}

export async function markTraineeThreadRead(traineeId: string, now: Date = new Date()): Promise<number> {
  const coaching = await getCurrentCoaching(traineeId);
  if (coaching) await markRead(coaching._id, 'coach', now);
  return 0;
}
