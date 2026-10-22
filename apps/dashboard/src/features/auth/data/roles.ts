import type { AuthUser, UserRole } from '@sistem/types';

/** Client-side gating only — every route checks the role on the server. */
export function hasRole(user: AuthUser | null | undefined, role: UserRole): boolean {
  return Boolean(user?.roles?.includes(role));
}

/** Where a signed-in dashboard user starts: coaches on the overview, an admin-only account on the coach list. */
export function dashboardHome(user: AuthUser | null | undefined, routes: { home: string; admin: string }): string | null {
  if (hasRole(user, 'coach')) return routes.home;
  if (hasRole(user, 'admin')) return routes.admin;
  return null;
}
