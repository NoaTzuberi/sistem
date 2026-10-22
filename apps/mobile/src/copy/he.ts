import { plural } from '@sistem/shared';

// The mobile app's own texts that belong to no feature (tab bar, shell). Hebrew = primary;
// DRAFT translations for the owner's review (phase-15 report).
export const he = {
  tabs: {
    home: 'בית',
    workouts: 'אימונים',
    nutrition: 'תזונה',
    profile: 'פרופיל',
    inbox: 'הודעות',
    trainees: 'מתאמנות',
    navigation: 'ראשי',
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
    weekdays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
  comingSoon: 'בקרוב.',
  unread: plural({ one: 'התראה אחת שלא נקראה', two: '2 התראות שלא נקראו', other: '{count} התראות שלא נקראו' }),
} as const;
