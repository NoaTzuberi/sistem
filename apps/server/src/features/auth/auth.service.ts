import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AuthUser, Language } from '@sistem/types';

interface AuthResponse {
  token: string;
  user: AuthUser;
  /** Set when the sign-up's invite code could not be used (the account is made anyway). */
  inviteError?: ServerMessage;
}
import { User, UserDocument, isOnboardingCompleted, primaryRole } from '../users/user.model';
import { config } from '../../config/env';
import { sendPasswordResetEmail } from './email.service';
import { getAppState } from '../users/appState.service';
import { isValidTimezone } from '../users/timezone';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { toPublicAvatar } from '../users/avatar';
import { resolveLanguage, resolveUnits } from '../users/units';
import { LocalizedError } from '../../i18n';
import type { ServerMessage } from '../../i18n';
import { extractInviteCode, redeemInvite } from '../invites/invite.service';

export const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export class EmailAlreadyInUseError extends LocalizedError {}
export class InvalidCredentialsError extends LocalizedError {}
export class UserNotFoundError extends LocalizedError {}
export class InvalidResetTokenError extends LocalizedError {}
export class SetPasswordTokenError extends LocalizedError {}

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: TOKEN_EXPIRY });
}

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function toPublicUser(user: UserDocument & { _id: unknown }): Promise<AuthUser> {
  const id = String(user._id);
  const { appState, coachingStatus } = await getAppState(id, user);
  return {
    id,
    name: user.name,
    email: user.email,
    roles: [...user.roles],
    role: primaryRole(user),
    appState,
    coachingStatus,
    onboardingStatus: user.onboardingStatus,
    onboardingCompleted: isOnboardingCompleted(user),
    onboardingCompletedAt: user.onboardingCompletedAt ? user.onboardingCompletedAt.toISOString() : null,
    timezone: user.timezone,
    units: resolveUnits(user.preferences),
    language: resolveLanguage(user.preferences),
    avatar: toPublicAvatar(user.avatar),
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Public sign-up — always a trainee (a role from the request never reaches the model) and never
 * linked to a coach by itself: only an invite code does that. A code that can't be used doesn't
 * block the sign-up (she can enter one later on the "no coach yet" screen); its message comes back.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
  timezone?: string,
  language?: Language,
  inviteCode?: string,
): Promise<AuthResponse> {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new EmailAlreadyInUseError('email_taken');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  // Only these fields — a role from the request body must never reach the model.
  const user = await User.create({
    name,
    email,
    passwordHash,
    // The device zone is a hint: an unknown value must not block sign-up.
    timezone: isValidTimezone(timezone) ? timezone : DEFAULT_TIMEZONE,
    // The language she signed up in (validated); unset = Hebrew.
    ...(language ? { preferences: { language } } : {}),
  });

  let inviteError: ServerMessage | undefined;
  if (inviteCode) {
    try {
      await redeemInvite(String(user._id), extractInviteCode(inviteCode));
    } catch (error) {
      if (!(error instanceof LocalizedError)) throw error;
      inviteError = error.serverMessage;
    }
  }

  return { token: signToken(String(user._id)), user: await toPublicUser(user), ...(inviteError ? { inviteError } : {}) };
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new UserNotFoundError('user_not_found');
  }
  return await toPublicUser(user);
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  // No password yet (an admin-created coach before her set-password link): same answer as a wrong one.
  if (!user?.passwordHash) {
    throw new InvalidCredentialsError('invalid_credentials');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new InvalidCredentialsError('invalid_credentials');
  }

  return { token: signToken(String(user._id)), user: await toPublicUser(user) };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) {
    // Never reveal whether an email is registered — resolve silently either way.
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashResetToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();

  const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}`;
  try {
    await sendPasswordResetEmail(user.email, resetUrl, resolveLanguage(user.preferences));
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await User.findOne({
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new InvalidResetTokenError('reset_token_invalid');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
}

/**
 * A one-time "set password" link for an account the admin created (no password yet), or a fresh one
 * for a coach who lost hers. Single use: the token is stored hashed and cleared when used; a new link
 * replaces the old one.
 */
export async function issueSetPasswordLink(userId: string, ttlMs: number, now: Date = new Date()): Promise<{ url: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + ttlMs);
  await User.updateOne({ _id: userId }, { $set: { passwordResetTokenHash: hashResetToken(rawToken), passwordResetExpires: expiresAt } });
  return { url: `${config.dashboardUrl.replace(/\/+$/, '')}/set-password?token=${rawToken}`, expiresAt };
}

/** Uses the link: sets the password, burns the token, and signs her in. */
export async function setPasswordWithToken(token: string, password: string): Promise<AuthResponse> {
  const user = await User.findOneAndUpdate(
    { passwordResetTokenHash: hashResetToken(token), passwordResetExpires: { $gt: new Date() } },
    { $set: { passwordHash: await bcrypt.hash(password, SALT_ROUNDS) }, $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 } },
    { returnDocument: 'after' },
  );
  if (!user) throw new SetPasswordTokenError('set_password_token_invalid');
  return { token: signToken(String(user._id)), user: await toPublicUser(user) };
}
