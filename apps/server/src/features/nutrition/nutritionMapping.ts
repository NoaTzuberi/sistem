import { Types } from 'mongoose';
import type {
  PortionCounts,
  FoodGroup,
  FoodItem,
  NutritionFoodFacts,
  NutritionMeal,
  NutritionMealInput,
  NutritionTip,
} from '@sistem/types';
import { FOOD_GROUP_IDS } from './nutrition.constants';
import type { FoodItemDocument, MealFields, TipFields } from './nutrition.types';

// Stored documents → API shapes, and saved input → stored subdocuments. Shared by the
// plan builder, the published versions, templates and the trainee's view.

export type LeanFoodItem = FoodItemDocument & { _id: Types.ObjectId };

export function toPublicFoodItem(item: LeanFoodItem): FoodItem {
  return {
    id: String(item._id),
    group: item.group,
    name: item.name,
    portion: item.portion,
    grams: item.grams ?? null,
    kcal: item.kcal ?? null,
    isNew: item.isNewItem === true,
    dietTags: item.dietTags ?? [],
    category: item.category ?? null,
    order: item.order ?? 0,
    archivedAt: item.archivedAt ? item.archivedAt.toISOString() : null,
  };
}

/** What the trainee may see of a food: no calories. */
export function toFoodFacts(item: Pick<FoodItem, 'id' | 'group' | 'name' | 'portion' | 'grams' | 'isNew' | 'category'>): NutritionFoodFacts {
  return { id: item.id, group: item.group, name: item.name, portion: item.portion, grams: item.grams, isNew: item.isNew, category: item.category };
}

export function compareFoods(a: Pick<FoodItem, 'order' | 'name'>, b: Pick<FoodItem, 'order' | 'name'>): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}

/** Every active item of each group, in the coach's order — the swap lists. */
export function groupSwaps(foods: readonly FoodItem[]): Record<FoodGroup, NutritionFoodFacts[]> {
  const swaps = Object.fromEntries(FOOD_GROUP_IDS.map((group) => [group, [] as NutritionFoodFacts[]])) as Record<
    FoodGroup,
    NutritionFoodFacts[]
  >;
  for (const food of [...foods].sort(compareFoods)) {
    if (!food.archivedAt) swaps[food.group].push(toFoodFacts(food));
  }
  return swaps;
}

/** Stored counts → API counts; data saved before snacks existed (13a+) reads as 0 snack. */
export function toPortionCounts(counts: Partial<PortionCounts> | null | undefined): PortionCounts {
  return { protein: counts?.protein ?? 0, carb: counts?.carb ?? 0, fat: counts?.fat ?? 0, snack: counts?.snack ?? 0 };
}

export function toPublicMeals(meals: readonly MealFields[]): NutritionMeal[] {
  return meals.map((meal) => ({
    id: String(meal._id),
    name: meal.name,
    portions: toPortionCounts(meal.portions),
    vegetablesFree: meal.vegetablesFree === true,
    options: meal.options.map((option) => ({
      id: String(option._id),
      label: option.label,
      lines: option.lines.map((line) => ({
        id: String(line._id),
        kind: line.kind,
        ...(line.foodItemId ? { foodItemId: String(line.foodItemId) } : {}),
        ...(line.recipeId ? { recipeId: String(line.recipeId) } : {}),
        group: line.group ?? null,
        portions: line.portions ?? null,
        ...(line.text ? { text: line.text } : {}),
      })),
    })),
  }));
}

export function toPublicTips(tips: readonly TipFields[]): NutritionTip[] {
  return tips.map((tip) => ({ id: String(tip._id), text: tip.text }));
}

/**
 * Keeps an id sent back with the id it already had (13b meal logs point at meal ids);
 * anything else — a new row, an unknown or repeated id — gets a fresh one.
 */
export function createIdKeeper(existingIds: Iterable<string>) {
  const existing = new Set(existingIds);
  const used = new Set<string>();
  return (id: string | undefined): Types.ObjectId => {
    if (id && existing.has(id) && !used.has(id)) {
      used.add(id);
      return new Types.ObjectId(id);
    }
    return new Types.ObjectId();
  };
}

export interface ExistingContentIds {
  meals: string[];
  options: string[];
  lines: string[];
  tips: string[];
}

export function collectContentIds(meals: readonly MealFields[], tips: readonly TipFields[]): ExistingContentIds {
  return {
    meals: meals.map((meal) => String(meal._id)),
    options: meals.flatMap((meal) => meal.options.map((option) => String(option._id))),
    lines: meals.flatMap((meal) => meal.options.flatMap((option) => option.lines.map((line) => String(line._id)))),
    tips: tips.map((tip) => String(tip._id)),
  };
}

/**
 * Saved input → stored meals. `foodGroups` gives each food line its item's group (the
 * line's group is never taken from the client). Pass no existing ids for a copy (template).
 */
export function toStoredMeals(
  meals: readonly NutritionMealInput[],
  foodGroups: Map<string, FoodGroup>,
  existing: ExistingContentIds = { meals: [], options: [], lines: [], tips: [] },
): MealFields[] {
  const mealId = createIdKeeper(existing.meals);
  const optionId = createIdKeeper(existing.options);
  const lineId = createIdKeeper(existing.lines);
  return meals.map((meal) => ({
    _id: mealId(meal.id),
    name: meal.name,
    portions: { ...meal.portions },
    vegetablesFree: meal.vegetablesFree,
    options: meal.options.map((option) => ({
      _id: optionId(option.id),
      label: option.label,
      lines: option.lines.map((line) => ({
        _id: lineId(line.id),
        kind: line.kind,
        ...(line.kind === 'food' && line.foodItemId
          ? { foodItemId: new Types.ObjectId(line.foodItemId), group: foodGroups.get(line.foodItemId) ?? null }
          : {}),
        ...(line.kind === 'recipe' && line.recipeId ? { recipeId: new Types.ObjectId(line.recipeId), group: null } : {}),
        ...(line.kind === 'text' ? { text: line.text, group: line.group ?? null } : {}),
        portions: line.portions ?? null,
      })),
    })),
  }));
}

export function toStoredTips(tips: readonly { id?: string; text: string }[], existingIds: Iterable<string> = []): TipFields[] {
  const tipId = createIdKeeper(existingIds);
  return tips.map((tip) => ({ _id: tipId(tip.id), text: tip.text }));
}

/** A copy with fresh ids (template → plan, plan → template). */
export function copyMeals(meals: readonly MealFields[], foodGroups: Map<string, FoodGroup>): MealFields[] {
  return toStoredMeals(
    toPublicMeals(meals).map(({ id: _mealId, options, ...meal }) => ({
      ...meal,
      options: options.map(({ id: _optionId, lines, ...option }) => ({
        ...option,
        lines: lines.map(({ id: _lineId, ...line }) => line),
      })),
    })),
    foodGroups,
  );
}

/** Every food item id the meals point at. */
export function foodIdsOf(meals: readonly Pick<NutritionMeal, 'options'>[]): string[] {
  return [
    ...new Set(meals.flatMap((meal) => meal.options.flatMap((option) => option.lines.flatMap((line) => (line.foodItemId ? [line.foodItemId] : []))))),
  ];
}
