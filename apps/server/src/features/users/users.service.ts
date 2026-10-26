import type { AuthUser, UpdatePreferencesPayload } from '@sistem/types';
import { User, isOnboardingCompleted } from './user.model';
import { toPublicUser } from '../auth/auth.service';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { LocalizedError } from '../../i18n';
import { canUseAppMode } from './appMode';

export class UserNotFoundError extends LocalizedError {}
/** The requested side of the app needs a role she doesn't hold (403). */
export class AppModeNotAllowedError extends LocalizedError {}

/**
 * Read model for the Profile page. Same response shape as ATLAS's User.profile, now
 * assembled from the User and the OnboardingResponse collection.
 */
export async function getUserProfileById(userId: string) {
  const user = await User.findById(userId).select('name preferences onboardingStatus').lean();
  if (!user) {
    throw new UserNotFoundError('user_not_found');
  }
  const response = await OnboardingResponse.findOne({ userId }).select('answers').lean();

  return {
    name: user.name,
    onboardingCompleted: isOnboardingCompleted(user),
    profile: response?.answers,
    preferences: user.preferences,
  };
}

/**
 * Changes her display units (Phase 10), the UI language (Phase 15) and / or the side of the app (coach
 * mode); each setting is set on its own, the others stay. The answer carries the new appState, so the
 * app moves to the other side at once (and every other device on its next /auth/me).
 */
export async function updateUserPreferences(userId: string, payload: UpdatePreferencesPayload): Promise<AuthUser> {
  if (payload.appMode) {
    const current = await User.findById(userId).select('roles').lean();
    if (!current) throw new UserNotFoundError('user_not_found');
    if (!canUseAppMode(current.roles, payload.appMode)) throw new AppModeNotAllowedError('app_mode_not_allowed');
  }
  const $set: Record<string, string> = {};
  if (payload.units?.weight) $set['preferences.units.weight'] = payload.units.weight;
  if (payload.units?.length) $set['preferences.units.length'] = payload.units.length;
  if (payload.language) $set['preferences.language'] = payload.language;
  if (payload.appMode) $set['preferences.appMode'] = payload.appMode;
  const user = await User.findByIdAndUpdate(userId, { $set }, { returnDocument: 'after', runValidators: true });
  if (!user) {
    throw new UserNotFoundError('user_not_found');
  }
  return toPublicUser(user);
}

/** "On my own" in the first run: remembered so a reopened app resumes at the questionnaire. Idempotent. */
export async function chooseSelfGuided(userId: string, now: Date = new Date()): Promise<AuthUser> {
  const user = await User.findOneAndUpdate(
    { _id: userId, selfGuidedAt: null },
    { $set: { selfGuidedAt: now } },
    { new: true },
  ) ?? (await User.findById(userId));
  if (!user) throw new UserNotFoundError('user_not_found');
  return toPublicUser(user);
}
