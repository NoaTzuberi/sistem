import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Types } from 'mongoose';
import type { DietTag, FoodCategory, FoodGroup, PortionCounts } from '@sistem/types';
import { Template } from '../templates/template.model';
import { FoodItem } from './foodItem.model';
import { toPortionCounts } from './nutritionMapping';
import { DIET_TAG_IDS, FOOD_GROUP_IDS, PORTION_GROUP_IDS, isCategoryOf } from './nutrition.constants';
import { isPortionCount } from './nutrition.validation';
import type { MealFields } from './nutrition.types';

// seed:nutrition — the app-wide food bank (system items, owner 2026-10-28). The ONLY source is the coach's md food lists in
// docs/reference/ (owner decision, 2026-10-08: 150-dairy, protien, carbohydrates_and_fruits_guide_120_calories,
// fats_spreads_nuts_90_calories, snacks), turned once into apps/server/data/nutrition/food-lists.json (gitignored);
// committed code only knows its shape. Idempotent: every item has a unique itemKey; anything already there is
// left as it is (the admin may have edited it), so a re-run adds only missing items. A file may also carry a
// nutrition template for one coach (none does today).

const SEED_DIR = path.resolve(__dirname, '../../../data/nutrition');

/** apps/server/data/nutrition/food-lists.json — gitignored. */
export const DEFAULT_NUTRITION_SEED_FILE = path.join(SEED_DIR, 'food-lists.json');

/** Every seed file, in order (gitignored). */
export const NUTRITION_SEED_FILES = [DEFAULT_NUTRITION_SEED_FILE];

export interface SeedFood {
  key: string;
  group: FoodGroup;
  name: string;
  portion: string;
  grams: number | null;
  isNew: boolean;
  dietTags: DietTag[];
  /** Seeded archived: kept for the coach, not in the builder or the swap lists (13a+). */
  archived?: boolean;
  /** One of the group's categories (13a+); filled in on an existing item only while it has none. */
  category?: FoodCategory;
}

export type SeedLine = { food: string; portions: number } | { text: string; group?: FoodGroup | null; portions?: number };

export interface NutritionSeedData {
  seedKeyPrefix: string;
  foods: SeedFood[];
  /** Optional; the coach's md lists have none. */
  template?: {
    key: string;
    name: string;
    description?: string;
    targetKcal: number | null;
    tips: string[];
    meals: {
      name: string;
      /** snack is optional (files from before 13a+). */
      portions: Partial<PortionCounts>;
      vegetablesFree: boolean;
      options: { label: string; lines: SeedLine[] }[];
    }[];
  };
}

export interface NutritionSeedResult {
  foodsCreated: number;
  foodsKept: number;
  /** Existing items that had no category and got the file's (13a+). */
  categoriesFilled: number;
  /** null = no template in the file (the coach's md lists have none), or no coach was given for it. */
  templateCreated: boolean | null;
}

/** Checks the file before anything is written: a bad reference must never half-seed. */
/** Calorie words in Hebrew or English (קלוריות, קל', kcal, calories). */
const MENTIONS_CALORIES = /קלור|קל'|kcal|calor/i;

export function validateNutritionSeed(data: NutritionSeedData): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const food of data.foods ?? []) {
    if (keys.has(food.key)) problems.push(`Duplicate food key ${food.key}.`);
    keys.add(food.key);
    if (!(FOOD_GROUP_IDS as readonly string[]).includes(food.group)) problems.push(`${food.key}: unknown group ${food.group}.`);
    if (!food.name?.trim() || !food.portion?.trim()) problems.push(`${food.key}: name and portion are required.`);
    if (food.category !== undefined && !isCategoryOf(food.group, food.category)) {
      problems.push(`${food.key}: category ${food.category} is not in the ${food.group} group.`);
    }
    // Name and portion reach the trainee's swap lists, where calorie numbers never appear (PRD §5.6).
    if (MENTIONS_CALORIES.test(`${food.name} ${food.portion}`)) problems.push(`${food.key}: name / portion mention calories.`);
    for (const tag of food.dietTags ?? []) {
      if (!(DIET_TAG_IDS as readonly string[]).includes(tag)) problems.push(`${food.key}: unknown diet tag ${tag}.`);
    }
  }
  const template = data.template;
  // A food-list file has no template (13a+).
  if (template === undefined) return problems;
  if (!template?.name?.trim() || !Array.isArray(template.meals) || template.meals.length === 0) {
    problems.push('The template needs a name and at least one meal.');
    return problems;
  }
  template.meals.forEach((meal, mealIndex) => {
    for (const group of PORTION_GROUP_IDS) {
      if (!isPortionCount(meal.portions?.[group] ?? 0, 10)) problems.push(`Meal ${mealIndex + 1}: bad ${group} portions.`);
    }
    for (const option of meal.options) {
      for (const line of option.lines) {
        if ('food' in line) {
          if (!keys.has(line.food)) problems.push(`Meal ${mealIndex + 1} (${option.label}): unknown food ${line.food}.`);
          if (!isPortionCount(line.portions, 10) || line.portions === 0) problems.push(`Meal ${mealIndex + 1}: bad portions for ${line.food}.`);
        } else if (!line.text?.trim()) {
          problems.push(`Meal ${mealIndex + 1} (${option.label}): a text line has no text.`);
        }
      }
    }
  });
  return problems;
}

export async function readNutritionSeedFile(path: string): Promise<NutritionSeedData> {
  return JSON.parse(await readFile(path, 'utf8')) as NutritionSeedData;
}

export interface ApplyNutritionSeedOptions {
  /** The file's template (if any) goes to this coach — templates are per coach. Without one it is skipped. */
  templateCoachId?: string;
}

/**
 * The food items become SYSTEM items of the app-wide food bank (owner 2026-10-28), upserted by their
 * itemKey (`<seedKeyPrefix>:<key>`, the same key the items had as one coach's seeded list, so the
 * migrated items match). Existing items are left as they are (the admin may have edited them).
 */
export async function applyNutritionSeed(data: NutritionSeedData, { templateCoachId }: ApplyNutritionSeedOptions = {}): Promise<NutritionSeedResult> {
  const problems = validateNutritionSeed(data);
  if (problems.length > 0) throw new Error(`The nutrition seed file is not valid:\n- ${problems.join('\n- ')}`);

  const itemKey = (key: string) => `${data.seedKeyPrefix}:${key}`;
  let foodsCreated = 0;
  let categoriesFilled = 0;
  // New items go after the bank's items in that group (the existing order stays as it is).
  const last = await FoodItem.aggregate<{ _id: FoodGroup; order: number }>([
    { $match: { scope: 'system' } },
    { $group: { _id: '$group', order: { $max: '$order' } } },
  ]);
  const nextOrder = new Map<FoodGroup, number>(last.map((entry) => [entry._id, entry.order + 1]));
  for (const food of data.foods) {
    const order = nextOrder.get(food.group) ?? 0;
    const result = await FoodItem.updateOne(
      { scope: 'system', itemKey: itemKey(food.key) },
      {
        $setOnInsert: {
          scope: 'system',
          coachId: null,
          itemKey: itemKey(food.key),
          group: food.group,
          name: food.name.trim(),
          portion: food.portion.trim(),
          grams: food.grams ?? null,
          kcal: null,
          isNewItem: food.isNew === true,
          dietTags: food.dietTags ?? [],
          category: food.category ?? null,
          order,
          archivedAt: food.archived ? new Date() : null,
        },
      },
      { upsert: true },
    );
    foodsCreated += result.upsertedCount;
    if (result.upsertedCount > 0) nextOrder.set(food.group, order + 1);
    else if (food.category) {
      // Never overwrites a chosen category: only an item with none (null or missing) gets one.
      const filled = await FoodItem.updateOne(
        { scope: 'system', itemKey: itemKey(food.key), group: food.group, category: null },
        { $set: { category: food.category } },
      );
      categoriesFilled += filled.modifiedCount;
    }
  }

  // null = no template in the file, or no coach to give it to.
  if (!data.template || !templateCoachId) {
    return { foodsCreated, foodsKept: data.foods.length - foodsCreated, categoriesFilled, templateCreated: null };
  }
  const coachId = templateCoachId;
  const seedKey = itemKey;
  const templateKey = seedKey(data.template.key);
  if (await Template.exists({ coachId, seedKey: templateKey })) {
    return { foodsCreated, foodsKept: data.foods.length - foodsCreated, categoriesFilled, templateCreated: false };
  }

  const items = await FoodItem.find({ scope: 'system', itemKey: { $in: data.foods.map((food) => itemKey(food.key)) } })
    .select('itemKey group')
    .lean();
  const byKey = new Map(items.map((item) => [item.itemKey!, item]));
  const meals: MealFields[] = data.template.meals.map((meal) => ({
    _id: new Types.ObjectId(),
    name: meal.name.trim(),
    portions: toPortionCounts(meal.portions),
    vegetablesFree: meal.vegetablesFree === true,
    options: meal.options.map((option) => ({
      _id: new Types.ObjectId(),
      label: option.label.trim(),
      lines: option.lines.map((line) => {
        if ('food' in line) {
          const item = byKey.get(seedKey(line.food))!;
          return { _id: new Types.ObjectId(), kind: 'food' as const, foodItemId: item._id, group: item.group, portions: line.portions };
        }
        const group = line.group ?? null;
        const counted = group !== null && group !== 'vegetable';
        return { _id: new Types.ObjectId(), kind: 'text' as const, text: line.text.trim(), group, portions: counted ? (line.portions ?? null) : null };
      }),
    })),
  }));

  await Template.create({
    coachId,
    type: 'nutrition_plan',
    seedKey: templateKey,
    name: data.template.name.trim(),
    description: data.template.description?.trim(),
    nutrition: {
      targetKcal: data.template.targetKcal ?? null,
      meals,
      tips: data.template.tips.map((text) => ({ _id: new Types.ObjectId(), text: text.trim() })),
    },
  });
  return { foodsCreated, foodsKept: data.foods.length - foodsCreated, categoriesFilled, templateCreated: true };
}
