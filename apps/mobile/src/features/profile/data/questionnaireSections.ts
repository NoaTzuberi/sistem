import type { OnboardingAnswers } from '@sistem/types';
import type { OnboardingFormState } from '../../onboarding/types';
import { isNutritionStepValid } from '../../onboarding/data/nutritionForm';

// "השאלון שלי": the questionnaire's real sections, in the onboarding's order. Each one is an
// onboarding step — its edit sheet saves that step (PATCH /onboarding), as onboarding does.

export type QuestionnaireStep =
  | 'basic_profile'
  | 'goals'
  | 'frequency'
  | 'activities'
  | 'exercise_preferences'
  | 'recovery'
  | 'equipment'
  | 'nutrition_preferences';

/** The section's tint (soft fill + its text color, tokens --color-qn-<tint>-soft / -ink). */
export type QuestionnaireTint = 'goals' | 'schedule' | 'activities' | 'equipment' | 'nutrition' | 'health';

export const QUESTIONNAIRE_SECTIONS: { step: QuestionnaireStep; tint: QuestionnaireTint }[] = [
  { step: 'basic_profile', tint: 'health' },
  { step: 'goals', tint: 'goals' },
  { step: 'frequency', tint: 'schedule' },
  { step: 'activities', tint: 'activities' },
  { step: 'exercise_preferences', tint: 'schedule' },
  { step: 'recovery', tint: 'health' },
  { step: 'equipment', tint: 'equipment' },
  { step: 'nutrition_preferences', tint: 'nutrition' },
];

const hasText = (value: string | undefined) => Boolean(value?.trim());

/** False = she hasn't answered anything in this section ("לא ענית" + "הוספה"). */
export function isSectionAnswered(step: QuestionnaireStep, answers: OnboardingAnswers): boolean {
  switch (step) {
    case 'basic_profile':
      return answers.weight !== undefined || answers.height !== undefined || answers.birthDate !== undefined;
    case 'goals':
      return answers.goals.length > 0;
    case 'frequency':
      return answers.trainingFrequency !== undefined;
    case 'activities':
      return answers.preferredActivities.length > 0;
    case 'exercise_preferences': {
      const preferences = answers.exercisePreferences;
      return Boolean(preferences && (preferences.muscleFocus.length > 0 || hasText(preferences.favoriteExerciseNotes) || hasText(preferences.improvementExerciseNotes)));
    }
    case 'recovery':
      return Boolean(answers.recovery && (answers.recovery.flags.length > 0 || hasText(answers.recovery.notes)));
    case 'equipment':
      return answers.equipment.length > 0;
    case 'nutrition_preferences':
      return answers.nutritionPreferences !== undefined || answers.weightGoal !== undefined;
  }
}

/** What Save needs — the same rules as the onboarding's Continue (the server checks again). */
export function isSectionDraftValid(step: QuestionnaireStep, draft: OnboardingFormState): boolean {
  switch (step) {
    case 'basic_profile':
      return draft.birthDate !== '' && Number(draft.height) > 0 && Number(draft.weight) > 0;
    case 'goals':
      return draft.goals.length > 0;
    case 'activities':
      return draft.preferredActivities.length > 0;
    case 'equipment':
      return draft.equipment.length > 0;
    case 'nutrition_preferences':
      return isNutritionStepValid(draft);
    default:
      return true;
  }
}

/** Whole years from a 'YYYY-MM-DD…' birth date to today (her device date). */
export function ageFromBirthDate(birthDate: string, now = new Date()): number {
  const [year, month, day] = birthDate.slice(0, 10).split('-').map(Number);
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
  return age;
}

/** Adds the id, or takes it away when already chosen. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
