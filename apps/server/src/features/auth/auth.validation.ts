import { type ServerMessage, msg } from '../../i18n';
import { LANGUAGE_IDS } from '../users/units';
interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: unknown;
  timezone?: unknown;
  language?: unknown;
  inviteCode?: unknown;
}

interface LoginInput {
  email?: string;
  password?: string;
}

interface ForgotPasswordInput {
  email?: string;
}

interface ResetPasswordInput {
  token?: string;
  password?: string;
  confirmPassword?: unknown;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateRegisterInput(input: RegisterInput): ServerMessage | null {
  const { name, email, password } = input;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return msg('name_required');
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return msg('email_invalid');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return msg('password_too_short', { min: MIN_PASSWORD_LENGTH });
  }
  if (input.confirmPassword !== undefined && input.confirmPassword !== password) {
    return msg('passwords_differ');
  }
  if (input.timezone !== undefined && typeof input.timezone !== 'string') {
    return msg('timezone_not_string');
  }
  if (input.language !== undefined && !(LANGUAGE_IDS as readonly unknown[]).includes(input.language)) {
    return msg('language_invalid');
  }
  if (input.inviteCode !== undefined && (typeof input.inviteCode !== 'string' || input.inviteCode.length > 300)) {
    return msg('invite_invalid');
  }

  return null;
}

export function validateLoginInput(input: LoginInput): ServerMessage | null {
  const { email, password } = input;

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return msg('email_invalid');
  }
  if (typeof password !== 'string' || password.length === 0) {
    return msg('password_required');
  }

  return null;
}

export function validateForgotPasswordInput(input: ForgotPasswordInput): ServerMessage | null {
  if (typeof input.email !== 'string' || !EMAIL_REGEX.test(input.email)) {
    return msg('email_invalid');
  }

  return null;
}

/** 'dashboard' from the coach dashboard; anything else = the trainee app (unchanged behavior). */
export function parsePasswordResetApp(value: unknown): 'dashboard' | undefined {
  return value === 'dashboard' ? 'dashboard' : undefined;
}

export function validateResetPasswordInput(input: ResetPasswordInput): ServerMessage | null {
  if (typeof input.token !== 'string' || input.token.trim().length === 0) {
    return msg('reset_token_required');
  }
  if (typeof input.password !== 'string' || input.password.length < MIN_PASSWORD_LENGTH) {
    return msg('password_too_short', { min: MIN_PASSWORD_LENGTH });
  }
  if (input.confirmPassword !== undefined && input.confirmPassword !== input.password) {
    return msg('passwords_differ');
  }

  return null;
}
