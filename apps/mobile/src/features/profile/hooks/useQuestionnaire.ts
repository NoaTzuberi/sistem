import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MyOnboarding } from '@sistem/types';
import { getActiveLanguage } from '@sistem/shared';
import { getMyOnboarding, saveOnboardingStep } from '../../../services/onboarding/onboardingService';
import { useAuth } from '../../../services/auth/AuthContext';
import { mapOnboardingToFormState } from '../../onboarding/data/formState';
import type { OnboardingFormState } from '../../onboarding/types';
import type { QuestionnaireStep } from '../data/questionnaireSections';
import { profileCopy } from '../copy';

/**
 * Her questionnaire answers (GET /onboarding) and one section's save — the same per-step
 * PATCH /onboarding the onboarding uses, so the coach reads the change right away (no notification:
 * a step save never sent one).
 */
export function useQuestionnaire() {
  const { user, updateUser } = useAuth();
  const [onboarding, setOnboarding] = useState<MyOnboarding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getMyOnboarding()
      .then((loaded) => {
        if (!cancelled) setOnboarding(loaded);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError((caught instanceof Error && caught.message) || profileCopy[getActiveLanguage()].loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // The edit sheets start from this (her saved answers, weight in her unit).
  const formState = useMemo<OnboardingFormState | null>(
    () => (onboarding ? mapOnboardingToFormState(onboarding, user?.name ?? '') : null),
    [onboarding, user?.name],
  );

  const save = useCallback(
    async (step: QuestionnaireStep, draft: OnboardingFormState) => {
      const saved = await saveOnboardingStep(step, draft);
      setOnboarding(saved.onboarding);
      updateUser(saved.user);
    },
    [updateUser],
  );

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  // Never filled: no answers saved yet.
  const isEmpty = onboarding !== null && (onboarding.answers === null || onboarding.status === 'not_started');

  return { onboarding, formState, error, reload, save, isEmpty };
}
