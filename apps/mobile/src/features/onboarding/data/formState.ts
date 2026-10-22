import type { MyOnboarding } from '@sistem/types';
import { toDisplayWeight } from '@sistem/shared';
import { INITIAL_ONBOARDING_STATE } from '../types';
import type { OnboardingFormState } from '../types';
import { fromAnswers } from './nutritionForm';

// Moved out of OnboardingPage (unchanged) so Profile's "My questionnaire" edit sheets start from the
// same form state and save through the same saveOnboardingStep.

/** Builds formState from the answers saved on the server, so resuming onboarding
 * and editing one step both start from real answers. */
export function mapOnboardingToFormState(onboarding: MyOnboarding, fallbackName: string): OnboardingFormState {
  const p = onboarding.answers;
  const weightUnit = onboarding.units?.weight ?? INITIAL_ONBOARDING_STATE.units.weight;
  return {
    name: onboarding.name || fallbackName,
    birthDate: p?.birthDate ? p.birthDate.slice(0, 10) : '',
    height: p?.height !== undefined ? String(p.height) : '',
    // Stored in kg; shown back in the unit she typed it in (the server converts lb on save).
    weight: p?.weight !== undefined ? String(toDisplayWeight(p.weight, weightUnit)) : '',
    gender: p?.gender ?? '',
    units: {
      weight: weightUnit,
      distance: onboarding.units?.distance ?? INITIAL_ONBOARDING_STATE.units.distance,
    },
    goals: p?.goals ?? [],
    trainingFrequency: p?.trainingFrequency ?? INITIAL_ONBOARDING_STATE.trainingFrequency,
    trainingExperience: p?.trainingExperience ?? null,
    preferredActivities: p?.preferredActivities ?? [],
    exercisePreferences: {
      favoriteExerciseNotes: p?.exercisePreferences?.favoriteExerciseNotes ?? '',
      improvementExerciseNotes: p?.exercisePreferences?.improvementExerciseNotes ?? '',
      muscleFocus: p?.exercisePreferences?.muscleFocus ?? [],
    },
    equipment: p?.equipment ?? [],
    recovery: {
      flags: p?.recovery?.flags ?? [],
      notes: p?.recovery?.notes ?? '',
    },
    ...fromAnswers(p, weightUnit),
  };
}
