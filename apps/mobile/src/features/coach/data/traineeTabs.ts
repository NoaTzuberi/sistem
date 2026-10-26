// The sections of the trainee screen (coach mode, docs/design/coach-app.html). Labels: coachCopy.detail.tabs.
export const TRAINEE_TABS = ['overview', 'workouts', 'nutrition', 'body'] as const;

export type TraineeTab = (typeof TRAINEE_TABS)[number];

export const DEFAULT_TRAINEE_TAB: TraineeTab = 'overview';

/** Kept in the URL (?tab=) so a reload or "back" returns to the same section. */
export const TRAINEE_TAB_PARAM = 'tab';

// The sections before the redesign: links that still name one (notification targets, old bookmarks) land
// on the section that now holds it.
const OLD_TABS: Record<string, TraineeTab> = {
  onboarding: 'body',
  plan: 'workouts',
  logs: 'workouts',
  tracking: 'nutrition',
  achievements: 'overview',
};

/** The section a ?tab= value opens. */
export function traineeTabOf(value: string | null): TraineeTab {
  if ((TRAINEE_TABS as readonly string[]).includes(value ?? '')) return value as TraineeTab;
  return (value && OLD_TABS[value]) || DEFAULT_TRAINEE_TAB;
}
