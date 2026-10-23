import { DEV_SEED_PASSWORD } from '../../users/scripts/devSeed.constants';

// Pure input checks for create:admin (kept apart from the script so they can be tested).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Stricter than sign-up (8): this account creates and suspends coaches.
export const MIN_ADMIN_PASSWORD_LENGTH = 12;
export const DEFAULT_ADMIN_NAME = 'Admin';

export interface CreateAdminInput {
  email: string;
  /** null = keep an existing account's password (only allowed when promoting). */
  password: string | null;
  name: string;
  allowRemote: boolean;
  resetPassword: boolean;
}

export type CreateAdminInputResult = { ok: true; input: CreateAdminInput } | { ok: false; error: string };

/** Never puts the password in an error message. */
export function checkAdminPassword(password: string): string | null {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`;
  }
  if (password === DEV_SEED_PASSWORD) {
    return 'ADMIN_PASSWORD must not be the public seed:dev password. Choose your own.';
  }
  return null;
}

export function readCreateAdminInput(env: NodeJS.ProcessEnv, args: string[]): CreateAdminInputResult {
  const email = (env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'ADMIN_EMAIL is not set.' };
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: 'ADMIN_EMAIL is not a valid email.' };

  // Not trimmed: spaces may be part of a password.
  const rawPassword = env.ADMIN_PASSWORD ?? '';
  if (rawPassword) {
    const passwordError = checkAdminPassword(rawPassword);
    if (passwordError) return { ok: false, error: passwordError };
  }

  const resetPassword = args.includes('--reset-password');
  if (resetPassword && !rawPassword) {
    return { ok: false, error: '--reset-password needs ADMIN_PASSWORD.' };
  }

  return {
    ok: true,
    input: {
      email,
      password: rawPassword || null,
      name: (env.ADMIN_NAME ?? '').trim() || DEFAULT_ADMIN_NAME,
      allowRemote: args.includes('--allow-remote'),
      resetPassword,
    },
  };
}
