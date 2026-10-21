import type { NutritionPlanMode, PortionCounts } from '@sistem/types';
import { PORTION_GROUP_IDS } from './nutrition.constants';
import { toPortionCounts } from './nutritionMapping';
import type { MealFields, PortionCountsFields } from './nutrition.types';

// What she gets (owner, 2026-10-20): 'portions' = daily portions per group, she picks the foods herself
// from the coach's lists; 'menu' = meals with options. Both are stored side by side on the plan and its
// versions, so switching never deletes anything. Plans saved before modes have no mode: one with an
// option line is a menu, otherwise portions (its meals' portions summed become the day).

export interface ModeFields {
  mode?: NutritionPlanMode | null;
  dailyPortions?: Partial<PortionCountsFields> | null;
  vegetablesFree?: boolean | null;
  meals: readonly Pick<MealFields, 'portions' | 'vegetablesFree' | 'options'>[];
}

function sumMeals(meals: ModeFields['meals']): PortionCounts {
  const total: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };
  for (const meal of meals) {
    const portions = toPortionCounts(meal.portions);
    for (const group of PORTION_GROUP_IDS) total[group] += portions[group];
  }
  return total;
}

export function resolvePlanMode(plan: ModeFields): NutritionPlanMode {
  if (plan.mode) return plan.mode;
  return plan.meals.some((meal) => meal.options.some((option) => option.lines.length > 0)) ? 'menu' : 'portions';
}

/** Portions mode's day: the stored daily portions, else (an older plan) the meals summed. */
export function resolveDailyPortions(plan: ModeFields): PortionCounts {
  return plan.dailyPortions ? toPortionCounts(plan.dailyPortions) : sumMeals(plan.meals);
}

export function resolveVegetablesFree(plan: ModeFields): boolean {
  if (resolvePlanMode(plan) === 'menu') return plan.meals.some((meal) => meal.vegetablesFree);
  return plan.vegetablesFree ?? plan.meals.some((meal) => meal.vegetablesFree);
}

/** The day's portions as she gets them — what the tracker counts against and the kcal come from. */
export function dayPortionsOf(plan: ModeFields): PortionCounts {
  return resolvePlanMode(plan) === 'portions' ? resolveDailyPortions(plan) : sumMeals(plan.meals);
}

export function portionsKcalOf(portions: PortionCounts, groupKcal: Record<string, number>): number {
  return Math.round(PORTION_GROUP_IDS.reduce((sum, group) => sum + portions[group] * (groupKcal[group] ?? 0), 0));
}
