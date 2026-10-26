import type { AppMode, AppState, CoachingStatus, OnboardingStatus, UserRole } from '@sistem/types';
import { resolveAppMode } from './appMode';
import { hasPublishedPlan } from '../plans/plan.service';
import { getCurrentCoaching } from '../coachings/coaching.service';

interface AppStateInput {
  roles: UserRole[];
  onboardingStatus: OnboardingStatus;
  onboardingCompletedAt?: Date | null;
  /** Set when she chose "on my own" in the first run (or finished onboarding without a coach). */
  selfGuidedAt?: Date | null;
  /** Her stored side of the app (only someone with both the coach and trainee role can choose). */
  preferences?: { appMode?: AppMode } | null;
}

export interface AppStateFacts {
  /** Her current (newest live) coaching, or null = self-guided. */
  coaching: { status: CoachingStatus; startedAt: Date } | null;
  hasPlan: boolean;
}

/**
 * Decides where a signed-in user lands (PRD §4.2). The client only follows this value — it never
 * derives the state itself. A coach is in coach mode unless she also trains and switched to the trainee
 * side (users/appMode.ts); an admin without either side uses the dashboard.
 * A trainee: no coach and no choice yet → "how do you want to train" → onboarding → waiting (she joined
 * a coach in the first run) or Home. Self-guided is a normal state: no coach → Home. A coach she joins
 * AFTER onboarding shows as a waiting card on Home — her own tools keep working, no full-screen wait.
 */
export function resolveAppState(user: AppStateInput, facts: AppStateFacts): AppState {
  const mode = resolveAppMode(user.roles, user.preferences?.appMode);
  if (mode === 'coach') return 'coach';
  if (mode === null) return 'admin';
  const { coaching, hasPlan } = facts;
  if (user.onboardingStatus !== 'completed') {
    return !coaching && !user.selfGuidedAt ? 'choose_path' : 'onboarding';
  }
  if (!coaching || hasPlan) return 'home';
  const joinedLater = user.onboardingCompletedAt != null && coaching.startedAt > user.onboardingCompletedAt;
  return joinedLater ? 'home' : 'waiting';
}

export interface ResolvedAppState {
  appState: AppState;
  coachingStatus: CoachingStatus | null;
}

export async function getAppState(userId: string, user: AppStateInput): Promise<ResolvedAppState> {
  // Coaches and admins never need the coaching / plan lookups.
  const early = resolveAppState(user, { coaching: { status: 'active', startedAt: new Date(0) }, hasPlan: true });
  if (early === 'coach' || early === 'admin') return { appState: early, coachingStatus: null };
  const coaching = await getCurrentCoaching(userId);
  const hasPlan = coaching && user.onboardingStatus === 'completed' ? await hasPublishedPlan(userId) : false;
  return { appState: resolveAppState(user, { coaching, hasPlan }), coachingStatus: coaching?.status ?? null };
}
