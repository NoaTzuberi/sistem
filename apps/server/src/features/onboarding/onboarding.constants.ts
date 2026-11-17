import type { OnboardingStepId } from '@sistem/types';

// Mirrors STEP_IDS in apps/mobile/src/features/onboarding/pages/OnboardingPage.
export const ONBOARDING_STEP_IDS = [
  'welcome',
  'basic_profile',
  'goals',
  'frequency',
  'activities',
  'exercise_preferences',
  'recovery',
  'equipment',
  'nutrition_preferences',
  'review',
  'starting_photo',
] as const satisfies readonly OnboardingStepId[];

export const ONBOARDING_FIELDS = [
  'name',
  'birthDate',
  'height',
  'weight',
  'gender',
  'units',
  'goals',
  'trainingFrequency',
  'preferredActivities',
  'exercisePreferences',
  'equipment',
  'recovery',
  'nutritionPreferences',
  'weightGoal',
  'trainingExperience',
  // Optional (2026-11-12): stored on the User like the name, so Settings can change it.
  'phone',
] as const;
export type OnboardingField = (typeof ONBOARDING_FIELDS)[number];

/** Which answers each step may save. Bookend and photo steps only record progress. */
export const ONBOARDING_STEP_FIELDS: Record<OnboardingStepId, readonly OnboardingField[]> = {
  welcome: [],
  basic_profile: ['name', 'birthDate', 'height', 'weight', 'gender', 'units', 'phone'],
  goals: ['goals'],
  // Phase 12b: the optional experience question sits on the frequency screen (owner, 2026-10-09).
  frequency: ['trainingFrequency', 'trainingExperience'],
  activities: ['preferredActivities'],
  exercise_preferences: ['exercisePreferences'],
  recovery: ['recovery'],
  equipment: ['equipment'],
  // Phase 13a — owner-approved addition to the protected onboarding ("Nutrition & goal"
  // since 13a+: preferences + the weight goal on one screen). Not required to complete:
  // trainees who finished before it existed are never sent back.
  nutrition_preferences: ['nutritionPreferences', 'weightGoal'],
  review: [],
  starting_photo: [],
};

// Fields that must be present to complete onboarding (the rest are optional).
export const REQUIRED_ON_COMPLETE: readonly OnboardingField[] = [
  'birthDate',
  'height',
  'weight',
  'units',
  'goals',
  'trainingFrequency',
  'preferredActivities',
  'equipment',
];

// The coach's window to publish the first plan, counted from onboardingCompletedAt (PRD §4.1).
export const PLAN_WAIT_MS = 48 * 60 * 60 * 1000;
