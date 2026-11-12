import { plural } from '@sistem/shared';

// The bell's notifications panel (dashboard design). The notifications' own sentences are shared
// with the mobile Inbox (shared copy: coachNotifications, coach.inbox). Wording from the design
// reference / brief unless marked PLACEHOLDER.
export const he = {
  bellLabel: plural({ one: 'התראות, אחת חדשה', two: 'התראות, 2 חדשות', other: 'התראות, {count} חדשות' }),
  newCount: plural({ one: 'אחת חדשה', two: '2 חדשות', other: '{count} חדשות' }),
  filterLabel: 'סינון ההתראות', // PLACEHOLDER
  filterAll: 'הכול',
  filterUnread: 'לא נקראו',
  filterUnreadCount: 'לא נקראו · {count}',
  allReadTitle: 'הכול נקרא',
  allReadBody: 'אין התראות חדשות כרגע',
  groupAttention: 'דורש טיפול',
  groupToday: 'היום',
  groupEarlier: 'מוקדם יותר',
  now: 'עכשיו',
  windowTitle: '{time} · {name}',
  windowCloses: 'חלון 48 השעות נסגר ב־{time}',
  dismiss: 'הסרת ההתראה: {title}', // PLACEHOLDER
} as const;
