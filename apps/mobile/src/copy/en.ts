import { plural, type CopyShape } from '@sistem/shared';
import type { he } from './he';

export const en: CopyShape<typeof he> = {
  tabs: {
    home: 'Home',
    workouts: 'Workouts',
    nutrition: 'Nutrition',
    profile: 'Profile',
    inbox: 'Inbox',
    today: 'Today',
    trainees: 'Trainees',
    navigation: 'Main',
  },
  // The small Latin mono "eyebrows" next to Hebrew section labels (decoration, aria-hidden). Latin in
  // both languages on purpose (owner's type system). Weekdays: Sunday first.
  eyebrow: {
    today: 'TODAY',
    thisWeek: 'THIS WEEK',
    nextWeek: 'NEXT WEEK',
    coach: 'COACH',
    nextGoal: 'NEXT GOAL',
    fuel: 'FUEL',
    extra: 'EXTRA',
    month: 'MONTH',
    log: 'LOG',
    upNext: 'UP NEXT',
    menu: 'MENU',
    photos: 'PHOTOS',
    mix: 'MIX',
    rest: 'REST',
    recap: 'RECAP',
    feel: 'FEEL',
    dailyPump: 'DAILY PUMP',
    done: 'DONE',
    trainee: 'TRAINEE',
    waiting: 'WAITING',
    last: 'LAST',
    body: 'BODY',
    yesterday: 'YESTERDAY',
    week: 'WK',
    weekdays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
  comingSoon: 'Coming soon.',
  unread: plural({ one: '{count} unread', other: '{count} unread' }),
};
