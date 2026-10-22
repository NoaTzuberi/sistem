import mongoose from 'mongoose';
import type { CoachNoteId } from '@sistem/types';
import { COACH_NOTE_IDS, DEFAULT_NOTIFICATION_PAGE_SIZE, MAX_NOTIFICATION_PAGE_SIZE } from './notification.constants';
import { type ServerMessage, msg } from '../../i18n';

export function validateNotificationIdParam(id: unknown): ServerMessage | null {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
    return msg('notification_id_invalid');
  }
  return null;
}

export interface NotificationListQuery {
  limit: number;
  before?: string;
  unreadOnly: boolean;
}

export function parseNotificationListQuery(
  query: Record<string, unknown>,
): { value: NotificationListQuery } | { error: ServerMessage } {
  let limit = DEFAULT_NOTIFICATION_PAGE_SIZE;
  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_NOTIFICATION_PAGE_SIZE) {
      return { error: msg('notification_limit_invalid', { max: MAX_NOTIFICATION_PAGE_SIZE }) };
    }
  }

  let before: string | undefined;
  if (query.before !== undefined) {
    if (typeof query.before !== 'string' || !mongoose.isValidObjectId(query.before)) {
      return { error: msg('notification_before_invalid') };
    }
    before = query.before;
  }

  if (query.unread !== undefined && query.unread !== 'true' && query.unread !== 'false') {
    return { error: msg('notification_unread_invalid') };
  }

  return { value: { limit, before, unreadOnly: query.unread === 'true' } };
}

/** POST /notifications/thanks { note }: which of her coach's notes she thanks for. */
export function parseThanksBody(body: unknown): { value: CoachNoteId } | { error: ServerMessage } {
  const note = (body as { note?: unknown } | null)?.note;
  if (typeof note !== 'string' || !(COACH_NOTE_IDS as readonly string[]).includes(note)) {
    return { error: msg('coach_note_invalid') };
  }
  return { value: note as CoachNoteId };
}
