export const ROUTES = {
  // The Overview (coach dashboard design) — where a signed-in coach lands.
  HOME: '/',
  LOGIN: '/login',
  STATS: '/stats',
  TRAINEES: '/trainees',
  TRAINEE: '/trainees/:traineeId',
  PLAN: '/trainees/:traineeId/plans/:planId',
  // Nutrition (Phase 13a): the coach's food list, templates and numbers, and each
  // trainee's nutrition plan builder.
  NUTRITION: '/nutrition',
  NUTRITION_FOODS: '/nutrition/foods',
  NUTRITION_TEMPLATES: '/nutrition/templates',
  NUTRITION_SETTINGS: '/nutrition/settings',
  TRAINEE_NUTRITION: '/trainees/:traineeId/nutrition',
  // Phase 12b: the exercise library by family — review patterns, families, primaries.
  EXERCISES: '/exercises',
} as const;

export const TRAINEE_TABS = ['onboarding', 'plans', 'nutrition', 'logs', 'metrics', 'achievements'] as const;
export type TraineeTab = (typeof TRAINEE_TABS)[number];
export const DEFAULT_TRAINEE_TAB: TraineeTab = 'onboarding';
/** The trainee page keeps its open tab in the URL, so links can point at one. */
export const TRAINEE_TAB_PARAM = 'tab';

/** The trainees list keeps its status filter in the URL, so the sidebar can link to "waiting". */
export const TRAINEE_FILTER_PARAM = 'filter';

export function traineesPath(filter?: string): string {
  return filter ? `${ROUTES.TRAINEES}?${TRAINEE_FILTER_PARAM}=${filter}` : ROUTES.TRAINEES;
}

/** Router state for a trainee's Plans tab: open the "new plan" week picker right away. */
export const NEW_PLAN_STATE = { newPlan: true } as const;
/** The same, with the picker on "from the AI draft" (the quick view's AI strip). */
export const AI_PLAN_STATE = { newPlan: true, ai: true } as const;
/** The same, with the picker in "duplicate last week" mode (the plan builder's header). */
export const DUPLICATE_WEEK_STATE = { newPlan: true, duplicate: true } as const;

export function traineePath(traineeId: string, tab?: TraineeTab): string {
  const path = `${ROUTES.TRAINEES}/${traineeId}`;
  return tab && tab !== DEFAULT_TRAINEE_TAB ? `${path}?${TRAINEE_TAB_PARAM}=${tab}` : path;
}

export function planPath(traineeId: string, planId: string): string {
  return `${ROUTES.TRAINEES}/${traineeId}/plans/${planId}`;
}

export function nutritionBuilderPath(traineeId: string): string {
  return `${ROUTES.TRAINEES}/${traineeId}/nutrition`;
}
