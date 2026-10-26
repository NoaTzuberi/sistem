import { type ServerMessage, msg } from '../../i18n';
import { DEFAULT_ACTIVITY_PAGE_SIZE, MAX_ACTIVITY_PAGE_SIZE } from './coachActivity.service';

type Parsed<T> = { value: T; error?: undefined } | { value?: undefined; error: ServerMessage };

export interface ActivityQuery {
  /** Only events strictly older than this; undefined = from now. */
  before?: Date;
  limit: number;
}

/** GET /coach/activity: ?before=<ISO date-time> (the previous page's nextBefore) & ?limit=1..50. */
export function parseActivityQuery(query: Record<string, unknown>): Parsed<ActivityQuery> {
  const { before, limit } = query;
  let beforeDate: Date | undefined;
  if (before !== undefined) {
    beforeDate = typeof before === 'string' ? new Date(before) : new Date(NaN);
    if (Number.isNaN(beforeDate.getTime())) return { error: msg('activity_before_invalid') };
  }
  let pageSize = DEFAULT_ACTIVITY_PAGE_SIZE;
  if (limit !== undefined) {
    pageSize = typeof limit === 'string' && /^\d+$/.test(limit) ? Number(limit) : NaN;
    if (!(pageSize >= 1 && pageSize <= MAX_ACTIVITY_PAGE_SIZE)) return { error: msg('activity_limit_invalid', { max: MAX_ACTIVITY_PAGE_SIZE }) };
  }
  return { value: { before: beforeDate, limit: pageSize } };
}
