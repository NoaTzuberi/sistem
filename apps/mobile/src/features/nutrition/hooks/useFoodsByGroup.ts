import { useMemo } from 'react';
import type { FoodCategory, FoodGroup, Language, NutritionFoodFacts } from '@sistem/types';
import { FOOD_CATEGORIES, foodCategoryLabel, searchByText, sharedCopy } from '@sistem/shared';

export interface FoodSection {
  /** The category id, or 'none' for items the coach left without one. */
  key: FoodCategory | 'none';
  label: string;
  foods: NutritionFoodFacts[];
}

/**
 * One group's swap list for the food sheet: filtered by the search (typo-tolerant, @sistem/shared), then
 * grouped by category in the group's category order; items without a category come last under "Other".
 */
export function useFoodsByGroup(swaps: Record<FoodGroup, NutritionFoodFacts[]>, group: FoodGroup, query: string, language: Language): FoodSection[] {
  const foods = swaps[group];
  return useMemo(() => {
    const found = searchByText(foods, query, (food) => food.name);
    const sections: FoodSection[] = FOOD_CATEGORIES[group]
      .map((category) => ({
        key: category,
        label: foodCategoryLabel(category, language),
        // A plan cached before categories were sent has none (category undefined).
        foods: found.filter((food) => (food.category ?? null) === category),
      }))
      .filter((section) => section.foods.length > 0);
    const rest = found.filter((food) => !food.category || !FOOD_CATEGORIES[group].includes(food.category));
    if (rest.length > 0) sections.push({ key: 'none', label: sharedCopy[language].nutrition.categories.other, foods: rest });
    return sections;
  }, [foods, group, query, language]);
}
