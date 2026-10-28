import type { Types } from 'mongoose';
import type { AppNotification, NotificationList } from '@sistem/types';
import { Notification } from './notification.model';
import type { NotificationDocument, NotificationPayload } from './notification.types';
import { LocalizedError } from '../../i18n';

export class NotificationNotFoundError extends LocalizedError {}

type LeanNotification = NotificationDocument & { _id: Types.ObjectId };

function dedupeKeyFor(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'trainee_onboarded':
      return `trainee_onboarded:${payload.data.traineeId}`;
    case 'plan_published':
      // Per plan: publishing the same plan again does not notify twice.
      return `plan_published:${payload.data.planId}`;
    case 'workout_completed':
      // Per log: a log is finished only once, but a retried finish must not notify twice.
      return `workout_completed:${payload.data.logId}`;
    case 'nutrition_plan_published':
      // Per version: every publish (first or update) is its own notification.
      return `nutrition_plan_published:${payload.data.planId}:${payload.data.version}`;
    case 'coach_note_thanks':
      // Per note: a second tap (or another device) never thanks twice.
      return `coach_note_thanks:${payload.data.noteId}`;
    case 'coaching_ended':
      // Per coaching: a coaching ends once.
      return `coaching_ended:${payload.data.coachingId}`;
  }
}

/**
 * The single way to notify a user. Stores the notification (in-app); Phase 5b adds
 * push delivery here, so callers never change. Safe to call twice for the same
 * event — the first notification is kept, read state included.
 */
export async function notify(userId: string, payload: NotificationPayload): Promise<void> {
  const dedupeKey = dedupeKeyFor(payload);
  await Notification.updateOne(
    { userId, dedupeKey },
    { $setOnInsert: { userId, dedupeKey, type: payload.type, data: payload.data, readAt: null } },
    { upsert: true },
  );
}

function toPublicNotification(notification: LeanNotification): AppNotification {
  return {
    id: String(notification._id),
    type: notification.type,
    data: notification.data,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  } as AppNotification;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, readAt: null });
}

interface ListNotificationsOptions {
  limit: number;
  /** A notification id: return only older ones. */
  before?: string;
  unreadOnly: boolean;
}

export async function listNotifications(
  userId: string,
  { limit, before, unreadOnly }: ListNotificationsOptions,
): Promise<NotificationList> {
  const filter: Record<string, unknown> = { userId };
  if (unreadOnly) filter.readAt = null;
  if (before) filter._id = { $lt: before };

  // One extra row tells us whether there is another page.
  const [rows, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean<LeanNotification[]>(),
    countUnreadNotifications(userId),
  ]);

  const page = rows.slice(0, limit);
  return {
    items: page.map(toPublicNotification),
    unreadCount,
    nextCursor: rows.length > limit ? String(page[page.length - 1]._id) : null,
  };
}

/** Someone else's notification looks the same as a missing one: not found. */
export async function markNotificationRead(userId: string, notificationId: string): Promise<AppNotification> {
  // Already-read notifications keep their first read time.
  await Notification.updateOne({ _id: notificationId, userId, readAt: null }, { $set: { readAt: new Date() } });
  const notification = await Notification.findOne({ _id: notificationId, userId }).lean<LeanNotification>();
  if (!notification) {
    throw new NotificationNotFoundError('notification_not_found');
  }
  return toPublicNotification(notification);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
}
