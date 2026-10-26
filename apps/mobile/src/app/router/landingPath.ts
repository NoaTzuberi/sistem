import type { AppState } from '@sistem/types';
import { ROUTES } from '../config/routes';

// Where each server-decided app state lands (PRD §4.2).
const LANDING_PATHS: Record<AppState, string> = {
  choose_path: ROUTES.FIRST_RUN,
  onboarding: ROUTES.ONBOARDING,
  waiting: ROUTES.WAITING,
  home: ROUTES.TRAINEE_HOME,
  coach: ROUTES.COACH_TODAY,
  admin: ROUTES.ADMIN_ONLY,
};

export function landingPath(appState: AppState): string {
  return LANDING_PATHS[appState];
}
