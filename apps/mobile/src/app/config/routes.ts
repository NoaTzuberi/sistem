export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROFILE: '/profile',
  // Body tracking (Phase 10, PRD §5.5) — sub-screens of Profile.
  PROFILE_WEIGHT: '/profile/weight',
  PROFILE_MEASUREMENTS: '/profile/measurements',
  PROFILE_MEASUREMENTS_LOG: '/profile/measurements/log',
  PROFILE_PHOTOS: '/profile/photos',
  PROFILE_PHOTOS_DAY: '/profile/photos/day',
  PROFILE_PHOTOS_COMPARE: '/profile/photos/compare',
  // Under /profile so the Profile tab stays highlighted.
  SETTINGS: '/profile/settings',
  // Her onboarding answers (what the coach sees) — opened from Profile's settings list.
  PROFILE_QUESTIONNAIRE: '/profile/questionnaire',
  // Every achievement + the streak (Phase 11) — opened from Home and Profile.
  PROFILE_ACHIEVEMENTS: '/profile/achievements',
  WORKOUTS: '/workouts',
  // Her nutrition plan (Phase 13a, PRD §5.6).
  NUTRITION: '/nutrition',
  ONBOARDING: '/onboarding',
  // "Your plan is being built" — onboarding done, no published plan yet (PRD §4.1).
  WAITING: '/waiting',
  EXERCISES: '/exercises',
  // Trainee Home — only reachable once a plan is published (PRD §4.2).
  TRAINEE_HOME: '/home',
  // The free interval timer (Phase 8): logs nothing.
  INTERVAL_TIMER: '/timer',
  COACH_INBOX: '/coach/inbox',
  COACH_TRAINEES: '/coach/trainees',
  COACH_PROFILE: '/coach/profile',
} as const;

// The exercise library pages are not routed in the mobile app (no trainee library
// screen). The paths stay for the kept page code, which moves into the coach
// dashboard plan builder in Phase 6.
export const EXERCISE_DETAIL_PATH = '/exercises/:slug';

export function exercisePath(slug: string): string {
  return `/exercises/${slug}`;
}

// Coach mode: one trainee (PRD §6). A "new trainee" notification opens this screen.
export const COACH_TRAINEE_PATH = '/coach/trainees/:traineeId';

export function coachTraineePath(traineeId: string): string {
  return `/coach/trainees/${traineeId}`;
}

// Trainee Workouts (PRD §5.4): one planned workout, one workout log, and the active
// session (PRD §5.2, full screen), keyed by its workout log.
export const WORKOUT_DETAIL_PATH = '/workouts/plan/:planId/:workoutId';
export const WORKOUT_LOG_PATH = '/workouts/logs/:logId';
export const WORKOUT_SESSION_PATH = '/workouts/session/:logId';
// The summary after Finish (PRD §5.3, full screen) — also reopened from the log page.
export const WORKOUT_SUMMARY_PATH = '/workouts/logs/:logId/summary';

export function workoutSummaryPath(logId: string): string {
  return `/workouts/logs/${logId}/summary`;
}

export function workoutSessionPath(logId: string): string {
  return `/workouts/session/${logId}`;
}

export function workoutPath(planId: string, workoutId: string): string {
  return `/workouts/plan/${planId}/${workoutId}`;
}

export function workoutLogPath(logId: string): string {
  return `/workouts/logs/${logId}`;
}

// `step` is a plain string here (not the feature's OnboardingStepId union) so this
// app-level config file stays free of any feature-level import — callers pass a
// valid step id and OnboardingPage itself validates it at render time.
export const ONBOARDING_EDIT_PATH = '/onboarding/:step';

export function onboardingEditPath(step: string): string {
  return `/onboarding/${step}`;
}

// One day of measurements / progress photos ('YYYY-MM-DD'); today when no date is given.
export function measurementsLogPath(date?: string): string {
  return date ? `${ROUTES.PROFILE_MEASUREMENTS_LOG}?date=${date}` : ROUTES.PROFILE_MEASUREMENTS_LOG;
}

export function progressPhotosDayPath(date?: string): string {
  return date ? `${ROUTES.PROFILE_PHOTOS_DAY}?date=${date}` : ROUTES.PROFILE_PHOTOS_DAY;
}

// A cardio workout of her plan, and its live run (full screen: countdown → player → finish).
export const CARDIO_DETAIL_PATH = '/workouts/cardio/:planId/:workoutId';
export const CARDIO_RUN_PATH = '/workouts/cardio/:planId/:workoutId/run';

export function cardioDetailPath(planId: string, workoutId: string): string {
  return `/workouts/cardio/${planId}/${workoutId}`;
}

export function cardioRunPath(planId: string, workoutId: string): string {
  return `/workouts/cardio/${planId}/${workoutId}/run`;
}
