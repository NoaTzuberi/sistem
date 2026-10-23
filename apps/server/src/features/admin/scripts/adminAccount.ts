import bcrypt from 'bcrypt';
import { User, hasRole } from '../../users/user.model';
import { DEFAULT_TIMEZONE } from '../../users/users.constants';
import { SALT_ROUNDS } from '../../auth/auth.service';
import type { CreateAdminInput } from './createAdminInput';

export type AdminAccountOutcome =
  | { kind: 'created' }
  | { kind: 'promoted'; passwordReset: boolean }
  | { kind: 'already_admin'; passwordReset: boolean }
  | { kind: 'missing_password' };

/**
 * Creates the admin account, or adds the admin role to an existing one (her other roles stay).
 * A new account is admin ONLY, so the app opens her admin screen instead of trainee onboarding.
 * An existing password is changed only with resetPassword.
 */
export async function createOrPromoteAdmin(
  input: Pick<CreateAdminInput, 'email' | 'password' | 'name' | 'resetPassword'>,
): Promise<AdminAccountOutcome> {
  const user = await User.findOne({ email: input.email });

  if (!user) {
    if (!input.password) return { kind: 'missing_password' };
    await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
      roles: ['admin'],
      timezone: DEFAULT_TIMEZONE,
    });
    return { kind: 'created' };
  }

  const wasAdmin = hasRole(user, 'admin');
  if (!wasAdmin) user.roles = [...user.roles, 'admin'];
  const passwordReset = input.resetPassword && Boolean(input.password);
  if (passwordReset && input.password) {
    user.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    // A pending reset / set-password link must not outlive the new password.
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
  }
  if (!wasAdmin || passwordReset) await user.save();

  return wasAdmin ? { kind: 'already_admin', passwordReset } : { kind: 'promoted', passwordReset };
}
