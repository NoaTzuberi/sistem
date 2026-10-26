import type { AuthUser } from '@sistem/types';

/**
 * Which side of the app she uses: the server's appMode (coach mode for a coach, unless she also trains and
 * switched to the trainee side in Profile). A cached account from before appMode existed falls back to
 * the roles: coach wins.
 */
export function appRole(user: Pick<AuthUser, 'roles' | 'appMode'> | null | undefined): 'coach' | 'trainee' | null {
  if (!user) return null;
  if (user.appMode !== undefined) return user.appMode;
  if (user.roles.includes('coach')) return 'coach';
  return user.roles.includes('trainee') ? 'trainee' : null;
}
