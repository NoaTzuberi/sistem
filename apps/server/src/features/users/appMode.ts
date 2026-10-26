import type { AppMode, UserRole } from '@sistem/types';

// Which side of the mobile app she uses. Only someone who holds BOTH the coach and the trainee
// role has a choice (Profile switch); everyone else has one side, decided by her roles. The stored
// choice is a preference: a role removed later always wins over it.

export const APP_MODE_IDS = ['coach', 'trainee'] as const satisfies readonly AppMode[];

/** True when she may use this side: 'coach' needs the coach role, 'trainee' the trainee role. */
export function canUseAppMode(roles: readonly UserRole[], mode: AppMode): boolean {
  return roles.includes(mode);
}

/** She holds both roles, so the Profile shows the switch. */
export function hasAppModeChoice(roles: readonly UserRole[]): boolean {
  return roles.includes('coach') && roles.includes('trainee');
}

/** Her side of the app: her stored choice when her roles allow it, else coach for a coach (default), else trainee. */
export function resolveAppMode(roles: readonly UserRole[], stored: AppMode | undefined): AppMode | null {
  if (stored && canUseAppMode(roles, stored)) return stored;
  if (roles.includes('coach')) return 'coach';
  return roles.includes('trainee') ? 'trainee' : null;
}
