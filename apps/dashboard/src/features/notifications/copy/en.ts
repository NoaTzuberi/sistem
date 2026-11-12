import { plural } from '@sistem/shared';
import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

// PLACEHOLDER English (the design is Hebrew).
export const en: CopyShape<typeof he> = {
  bellLabel: plural({ one: 'Notifications, {count} new', other: 'Notifications, {count} new' }),
  newCount: plural({ one: '{count} new', other: '{count} new' }),
  filterLabel: 'Filter notifications',
  filterAll: 'All',
  filterUnread: 'Unread',
  filterUnreadCount: 'Unread · {count}',
  allReadTitle: 'All read',
  allReadBody: 'No new notifications right now',
  groupAttention: 'Needs attention',
  groupToday: 'Today',
  groupEarlier: 'Earlier',
  now: 'Now',
  windowTitle: '{time} · {name}',
  windowCloses: 'The 48-hour window closes at {time}',
  dismiss: 'Remove the notification: {title}',
};
