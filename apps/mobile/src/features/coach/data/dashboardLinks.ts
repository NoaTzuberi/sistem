import { COACH_DASHBOARD_URL } from '../../../app/config/env';

// "נפתח בדשבורד": deep links into the coach's web dashboard (apps/dashboard routes). Hidden when no dashboard
// address is set. A dashboard on a static host uses hash routes: set VITE_COACH_DASHBOARD_URL to end in "#".

function dashboardUrl(path: string): string | null {
  if (!COACH_DASHBOARD_URL) return null;
  const base = COACH_DASHBOARD_URL.replace(/\/+$/, '');
  return `${base}${path}`;
}

export const dashboardLinks = {
  home: () => dashboardUrl('/'),
  /** Her plans in the dashboard (the plan builder starts there). */
  traineePlans: (traineeId: string) => dashboardUrl(`/trainees/${encodeURIComponent(traineeId)}?tab=plans`),
  traineeNutrition: (traineeId: string) => dashboardUrl(`/trainees/${encodeURIComponent(traineeId)}/nutrition`),
  /** Payment details (the dashboard's Settings page). */
  settings: () => dashboardUrl('/settings'),
};
