import type { AuthUser, UpdatePreferencesPayload } from '@sistem/types';
import { User, isOnboardingCompleted } from './user.model';
import { toPublicUser } from '../auth/auth.service';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { LocalizedError } from '../../i18n';

export class UserNotFoundError extends LocalizedError {}

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
 * Changes her display units (Phase 10) and / or the UI language (Phase 15); each setting is
 * set on its own, the others stay.
 */
export async function updateUserPreferences(userId: string, payload: UpdatePreferencesPayload): Promise<AuthUser> {
  const $set: Record<string, string> = {};
  if (payload.units?.weight) $set['preferences.units.weight'] = payload.units.weight;
  if (payload.units?.length) $set['preferences.units.length'] = payload.units.length;
  if (payload.language) $set['preferences.language'] = payload.language;
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
