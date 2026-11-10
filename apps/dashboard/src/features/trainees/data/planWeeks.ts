import type { CoachPlan, Language } from '@sistem/types';
import { fill, splitLabel } from '@sistem/shared';
import { traineesCopy } from '../copy';

/** "3 workouts · 20 exercises". */
export function describePlanSize(plan: CoachPlan, language: Language): string {
  const exercises = plan.workouts.reduce((total, workout) => total + workout.exercises.length, 0);
  return fill(traineesCopy[language].planSize, { workouts: plan.workouts.length, exercises });
}

/** What a plan is called: its split when it follows one — plans have no title of their own. */
export function planName(plan: CoachPlan, language: Language): string | undefined {
  return plan.splitId ? splitLabel(plan.splitId, language) : undefined;
}
