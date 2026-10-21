import { useMemo } from 'react';
import type { FoodGroup, PortionCounts, PortionGroup } from '@sistem/types';
import type { DraftMeal, NutritionDraft } from '../nutritionDraft';

/** The groups the day's target splits into (the calculation never adds snack portions; the coach may). */
export const BUDGET_GROUPS = ['protein', 'carb', 'fat'] as const;
export type BudgetGroup = (typeof BUDGET_GROUPS)[number];

export interface BudgetLine {
  group: BudgetGroup;
  allocated: number;
  target: number;
  /** allocated − target: negative = missing. */
  diff: number;
  state: 'missing' | 'over' | 'ok';
}

export interface PortionBudget {
  /** no_target: no kcal yet · pending: a target the server has not split yet (until the next save). */
  state: 'no_target' | 'pending' | 'missing' | 'over' | 'exact';
  allocated: PortionCounts;
  allocatedKcal: number;
  targetKcal: number | null;
  /** allocated kcal / target kcal (0 without a target). */
  fraction: number;
  lines: BudgetLine[];
  /** Snack portions given out (no target: the coach adds them on purpose). */
  snack: { portions: number; kcal: number };
}

const EMPTY: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };

/** kcal of portions with the server's per-group values (the same multiplication it does). */
export function portionsKcal(portions: PortionCounts, groupKcal: Record<FoodGroup, number>): number {
  return (['protein', 'carb', 'fat', 'snack'] as PortionGroup[]).reduce((sum, group) => sum + portions[group] * groupKcal[group], 0);
}

/** The meals' portions summed over the day. */
export function sumMealPortions(meals: readonly DraftMeal[]): PortionCounts {
  return meals.reduce<PortionCounts>(
    (sum, meal) => ({
      protein: sum.protein + meal.portions.protein,
      carb: sum.carb + meal.portions.carb,
      fat: sum.fat + meal.portions.fat,
      snack: sum.snack + meal.portions.snack,
    }),
    { ...EMPTY },
  );
}

/** What she gets per day in the draft's mode: the daily portions, or the meals summed. */
export function draftDayPortions(draft: Pick<NutritionDraft, 'mode' | 'dailyPortions' | 'meals'>): PortionCounts {
  return draft.mode === 'portions' ? draft.dailyPortions : sumMealPortions(draft.meals);
}

/**
 * The live portion budget: what the day gives out now (the daily portions in portions mode, the meals
 * summed in menu mode — from the draft, as it is typed) against the day's recommended portions for the
 * target (the server's or the live calculation's — `targetPortions`).
 */
export function usePortionBudget(
  allocated: PortionCounts,
  targetKcal: number | undefined,
  targetPortions: PortionCounts | null,
  groupKcal: Record<FoodGroup, number>,
): PortionBudget {
  return useMemo(() => {
    const allocatedKcal = portionsKcal(allocated, groupKcal);
    const target = targetPortions ?? EMPTY;
    const lines: BudgetLine[] = BUDGET_GROUPS.map((group) => {
      const diff = allocated[group] - target[group];
      return { group, allocated: allocated[group], target: target[group], diff, state: diff < 0 ? 'missing' : diff > 0 ? 'over' : 'ok' };
    });
    const snack = { portions: allocated.snack, kcal: allocated.snack * groupKcal.snack };

    let state: PortionBudget['state'];
    if (targetKcal === undefined) state = 'no_target';
    else if (!targetPortions) state = 'pending';
    else if (lines.some((line) => line.state === 'missing')) state = 'missing';
    else if (lines.some((line) => line.state === 'over')) state = 'over';
    else state = 'exact';

    return {
      state,
      allocated,
      allocatedKcal,
      targetKcal: targetKcal ?? null,
      fraction: targetKcal ? allocatedKcal / targetKcal : 0,
      lines,
      snack,
    };
  }, [allocated, targetKcal, targetPortions, groupKcal]);
}
