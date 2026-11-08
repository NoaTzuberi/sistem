import { NO_CONNECTION_CODE, authErrorCode } from '@sistem/api-client';
import type { AuthErrorKey } from '../validation';

/** Which field a server validation code belongs to (its message shows under that field). */
export type AuthFailureField = 'name' | 'email' | 'password' | 'confirm';

/**
 * A failed sign-up / login, read from the server's stable code — never its wording, so the text follows
 * the language on screen. 'message' = a known server answer without a screen of its own (e.g. wrong
 * password): its sentence comes back localized. 'unknown' = the generic "failed, try again" line.
 */
export type AuthFailure =
  | { kind: 'field'; field: AuthFailureField; key: AuthErrorKey }
  | { kind: 'emailTaken' | 'rateLimited' | 'noConnection' | 'unknown' }
  | { kind: 'message'; text: string };

const FIELD_CODES: Record<string, { field: AuthFailureField; key: AuthErrorKey }> = {
  name_required: { field: 'name', key: 'nameRequired' },
  email_invalid: { field: 'email', key: 'emailInvalid' },
  password_too_short: { field: 'password', key: 'passwordTooShort' },
  password_required: { field: 'password', key: 'passwordRequired' },
  passwords_differ: { field: 'confirm', key: 'passwordsDiffer' },
};

export function readAuthFailure(error: unknown): AuthFailure {
  const code = authErrorCode(error);
  if (code === NO_CONNECTION_CODE) return { kind: 'noConnection' };
  if (code === 'too_many_requests') return { kind: 'rateLimited' };
  if (code === 'email_taken') return { kind: 'emailTaken' };
  if (code && FIELD_CODES[code]) return { kind: 'field', ...FIELD_CODES[code] };
  if (code && error instanceof Error && error.message) return { kind: 'message', text: error.message };
  return { kind: 'unknown' };
}
