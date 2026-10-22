import { matchPath } from 'react-router-dom';
import { CARDIO_DETAIL_PATH, CARDIO_RUN_PATH, ROUTES, WORKOUT_SESSION_PATH, WORKOUT_SUMMARY_PATH } from './routes';

// The dock's tabs by app side (PRD §5 trainee tabs, §6 coach mode — services/auth/appRole; an admin
// without a coach role has no dock), in dock order — the order decides
// the direction of the screen transition (a higher index = forward).

export type TabId = 'home' | 'workouts' | 'nutrition' | 'profile' | 'inbox' | 'trainees';

export interface TabRoute {
  id: TabId;
  to: string;
}

export const TABS: Record<'trainee' | 'coach', TabRoute[]> = {
  trainee: [
    { id: 'home', to: ROUTES.TRAINEE_HOME },
    { id: 'workouts', to: ROUTES.WORKOUTS },
    { id: 'nutrition', to: ROUTES.NUTRITION },
    { id: 'profile', to: ROUTES.PROFILE },
  ],
  coach: [
    { id: 'inbox', to: ROUTES.COACH_INBOX },
    { id: 'trainees', to: ROUTES.COACH_TRAINEES },
    { id: 'profile', to: ROUTES.COACH_PROFILE },
  ],
};

// Full-screen flows under a tab's path: no dock, no tab transition.
// The cardio detail too: its slide floats where the dock would be (docs/design/trainee-cardio.html).
const FULL_SCREEN = [WORKOUT_SESSION_PATH, WORKOUT_SUMMARY_PATH, CARDIO_DETAIL_PATH, CARDIO_RUN_PATH];

function belongsTo(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** The tab a screen belongs to (its detail screens count), or null for a screen outside the tabs. */
export function tabIndexOf(pathname: string): number | null {
  if (FULL_SCREEN.some((pattern) => matchPath(pattern, pathname))) return null;
  for (const tabs of Object.values(TABS)) {
    const index = tabs.findIndex((tab) => belongsTo(pathname, tab.to));
    if (index !== -1) return index;
  }
  return null;
}
