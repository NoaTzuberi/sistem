import { type ServerMessage, msg } from '../../i18n';
import { DEFAULT_MESSAGE_PAGE_SIZE, MAX_MESSAGE_LENGTH, MAX_MESSAGE_PAGE_SIZE } from './message.constants';

type Parsed<T> = { value: T; error?: undefined } | { value?: undefined; error: ServerMessage };

/** POST …/messages { text }: 1..MAX_MESSAGE_LENGTH characters after trimming. */
export function parseSendMessageBody(body: unknown): Parsed<string> {
  const { text } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== 'string' || !text.trim()) return { error: msg('message_text_required') };
  if (text.trim().length > MAX_MESSAGE_LENGTH) return { error: msg('message_text_too_long', { max: MAX_MESSAGE_LENGTH }) };
  return { value: text.trim() };
}

export interface MessagePageQuery {
  before?: Date;
  limit: number;
}

/** ?before=<ISO> (the previous page's nextBefore) & ?limit=1..100 */
export function parseMessagePageQuery(query: Record<string, unknown>): Parsed<MessagePageQuery> {
  const { before, limit } = query;
  let beforeDate: Date | undefined;
  if (before !== undefined) {
    beforeDate = typeof before === 'string' ? new Date(before) : new Date(NaN);
    if (Number.isNaN(beforeDate.getTime())) return { error: msg('activity_before_invalid') };
  }
  let pageSize = DEFAULT_MESSAGE_PAGE_SIZE;
  if (limit !== undefined) {
    pageSize = typeof limit === 'string' && /^\d+$/.test(limit) ? Number(limit) : NaN;
    if (!(pageSize >= 1 && pageSize <= MAX_MESSAGE_PAGE_SIZE)) return { error: msg('activity_limit_invalid', { max: MAX_MESSAGE_PAGE_SIZE }) };
  }
  return { value: { before: beforeDate, limit: pageSize } };
}
