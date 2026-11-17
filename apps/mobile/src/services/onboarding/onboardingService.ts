import type {
  MyOnboarding,
  OnboardingAnswersPayload,
  OnboardingSaveResponse,
  OnboardingStepId,
  SaveOnboardingStepPayload,
} from '@sistem/types';
import { extractErrorMessage } from '@sistem/api-client';
import { apiClient } from '../api/apiClient';
import type { OnboardingFormState } from '../../features/onboarding/types';
import { asksWeightGoal, toPreferencesPayload, toWeightGoalPayload } from '../../features/onboarding/data/nutritionForm';

// Answers live in the server's OnboardingResponse collection (Phase 3). `name` and
// `units` are saved on the user; the server handles that split.

// Which answers each step saves — mirrors ONBOARDING_STEP_FIELDS on the server.
const STEP_FIELDS: Record<OnboardingStepId, (keyof OnboardingAnswersPayload)[]> = {
  welcome: [],
  basic_profile: ['name', 'birthDate', 'height', 'weight', 'gender', 'units', 'phone'],
  goals: ['goals'],
  frequency: ['trainingFrequency', 'trainingExperience'],
  activities: ['preferredActivities'],
  exercise_preferences: ['exercisePreferences'],
  recovery: ['recovery'],
  equipment: ['equipment'],
  nutrition_preferences: ['nutritionPreferences', 'weightGoal'],
  review: [],
  starting_photo: [],
};

function toAnswersPayload(formState: OnboardingFormState): OnboardingAnswersPayload {
  return {
    name: formState.name.trim() || undefined,
    // '' clears it on the server.
    phone: formState.phone.trim(),
    birthDate: formState.birthDate,
    height: Number(formState.height),
    weight: Number(formState.weight),
    gender: formState.gender.trim() || undefined,
    units: formState.units,
    goals: formState.goals,
    trainingFrequency: formState.trainingFrequency,
    trainingExperience: formState.trainingExperience,
    preferredActivities: formState.preferredActivities,
    exercisePreferences: {
      favoriteExerciseNotes: formState.exercisePreferences.favoriteExerciseNotes.trim() || undefined,
      improvementExerciseNotes:
        formState.exercisePreferences.improvementExerciseNotes.trim() || undefined,
      muscleFocus: formState.exercisePreferences.muscleFocus,
    },
    equipment: formState.equipment,
    recovery: {
      flags: formState.recovery.flags,
      notes: formState.recovery.notes.trim() || undefined,
    },
    nutritionPreferences: toPreferencesPayload(formState.nutritionPreferences),
    // Sent only when "My goal" is asked; otherwise a saved goal stays as it is.
    ...(asksWeightGoal(formState.goals) ? { weightGoal: toWeightGoalPayload(formState.weightGoal) } : {}),
  };
}

function pickStepAnswers(step: OnboardingStepId, formState: OnboardingFormState): OnboardingAnswersPayload {
  const all = toAnswersPayload(formState);
  const answers: OnboardingAnswersPayload = {};
  for (const field of STEP_FIELDS[step]) {
    // Assigning through a widened record: each field keeps its own type from `all`.
    if (all[field] !== undefined) (answers as Record<string, unknown>)[field] = all[field];
  }
  return answers;
}

export async function getMyOnboarding(): Promise<MyOnboarding> {
  try {
    const { data } = await apiClient.get<{ onboarding: MyOnboarding }>('/onboarding');
    return data.onboarding;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Couldn't load your answers. Please try again."));
  }
}

/** Saves one step's answers (after every onboarding step, and the Profile page's "edit this step"). */
export async function saveOnboardingStep(
  step: OnboardingStepId,
  formState: OnboardingFormState,
): Promise<OnboardingSaveResponse> {
  const payload: SaveOnboardingStepPayload = { step, answers: pickStepAnswers(step, formState) };
  try {
    const { data } = await apiClient.patch<OnboardingSaveResponse>('/onboarding', payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Could not save your answers. Please try again.'));
  }
}

/**
 * "Skip" on an optional step: records the step as passed (resume moves past it) without
 * saving any of its answers — what she saved there before stays.
 */
export async function skipOnboardingStep(step: OnboardingStepId): Promise<OnboardingSaveResponse> {
  const payload: SaveOnboardingStepPayload = { step, answers: {} };
  try {
    const { data } = await apiClient.patch<OnboardingSaveResponse>('/onboarding', payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Could not save your answers. Please try again.'));
  }
}

/**
 * Final submit: every answer; the server stamps the completion time. The optional
 * "Nutrition & goal" answers are left out — that step saved them itself, and a skipped
 * step must stay unanswered.
 */
export async function completeOnboarding(formState: OnboardingFormState): Promise<OnboardingSaveResponse> {
  const { nutritionPreferences: _preferences, weightGoal: _weightGoal, ...answers } = toAnswersPayload(formState);
  try {
    const { data } = await apiClient.post<OnboardingSaveResponse>('/onboarding/complete', answers);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Could not save your profile. Please try again.'));
  }
}
