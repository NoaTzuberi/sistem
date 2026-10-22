export const NOTIFICATION_TYPE_IDS = [
  'trainee_onboarded',
  'plan_published',
  'workout_completed',
  'nutrition_plan_published',
  'coach_note_thanks',
] as const;

/** The coach notes a trainee can thank for on Home: this week's plan notes, her nutrition intro. */
export const COACH_NOTE_IDS = ['plan', 'nutrition'] as const;

export const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;
export const MAX_NOTIFICATION_PAGE_SIZE = 50;
