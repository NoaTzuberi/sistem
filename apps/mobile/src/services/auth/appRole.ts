import type { AuthUser } from '@sistem/types';

/**
 * Which side of the app she uses: coach mode when she holds the coach role, else the trainee app.
 * (AuthUser.role is the primary role — an admin who coaches is 'admin' there — so the app reads roles.)
 */
export function appRole(user: Pick<AuthUser, 'roles'> | null | undefined): 'coach' | 'trainee' | null {
  if (!user) return null;
  if (user.roles.includes('coach')) return 'coach';
  return user.roles.includes('trainee') ? 'trainee' : null;
}
