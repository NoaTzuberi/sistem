import type {
  AllergyId,
  DietStyleId,
  DietTag,
  DietType,
  FoodCategory,
  FoodGroup,
  FormulaSex,
  IntoleranceId,
  NutritionGoal,
  NutritionLineKind,
  PortionGroup,
  ReligiousId,
} from '@sistem/types';

/** The food bank's two kinds of items (foodItem.model.ts). */
export const FOOD_SCOPE_IDS = ['system', 'coach'] as const;

export const FOOD_GROUP_IDS = ['protein', 'carb', 'fat', 'snack', 'vegetable'] as const satisfies readonly FoodGroup[];
/**
 * Food categories per group (13a+, the picker / list filters) — derived from the section headings of the coach's md
 * lists. THE list of ids (labels and order for the apps: @sistem/shared nutritionDisplay.ts — placeholders).
 */
export const FOOD_CATEGORY_IDS = {
  protein: ['dairy', 'poultry', 'meat', 'fish_seafood', 'eggs', 'plant_based', 'supplements'],
  carb: ['grains_cereals', 'bread_crackers', 'fruits', 'legumes', 'starchy_vegetables'],
  fat: ['oils', 'nuts_seeds', 'spreads', 'other'],
  snack: ['sweet_cereals', 'chocolate', 'cookies_pastries', 'ice_cream', 'candy', 'salty', 'fast_food'],
  vegetable: [],
} as const satisfies Record<FoodGroup, readonly FoodCategory[]>;

export function isCategoryOf(group: FoodGroup, category: unknown): category is FoodCategory {
  return (FOOD_CATEGORY_IDS[group] as readonly unknown[]).includes(category);
}

/** The groups a meal counts — vegetables are free (PRD §5.6). */
export const PORTION_GROUP_IDS = ['protein', 'carb', 'fat', 'snack'] as const satisfies readonly PortionGroup[];

/** What she gets (owner, 2026-10-20): daily portions, or meals with options. */
export const NUTRITION_PLAN_MODE_IDS = ['portions', 'menu'] as const;

export const DIET_TAG_IDS = [
  'meat',
  'poultry',
  'fish',
  'dairy',
  'eggs',
  'gluten',
  'peanuts',
  'tree_nuts',
  'sesame',
  'soy',
  // Phase 13a+
  'shellfish',
  'pork',
  'lactose',
  'alcohol',
  'high_fodmap',
] as const satisfies readonly DietTag[];

// Onboarding "Nutrition & goal" (Phase 13a, v2 in 13a+). Mirrored in the mobile onboarding options.
export const DIET_TYPE_IDS = ['none', 'vegetarian', 'vegan', 'pescatarian'] as const satisfies readonly DietType[];
export const DIET_STYLE_IDS = ['keto_low_carb', 'intermittent_fasting', 'other'] as const satisfies readonly DietStyleId[];
export const RELIGIOUS_IDS = ['kosher', 'halal'] as const satisfies readonly ReligiousId[];
export const INTOLERANCE_IDS = ['lactose_free', 'gluten_free', 'celiac', 'low_fodmap', 'other'] as const satisfies readonly IntoleranceId[];
export const ALLERGY_IDS = [
  'dairy',
  'eggs',
  'peanuts',
  'tree_nuts',
  'sesame',
  'soy',
  'gluten',
  'fish',
  'shellfish',
  'other',
] as const satisfies readonly AllergyId[];
export const MAX_PREFERENCE_TEXT_LENGTH = 500;
export const MAX_PREFERENCE_DETAILS_LENGTH = 300;
export const MEALS_PER_DAY_RANGE = { min: 2, max: 6 } as const;

// Weight goal ("My goal"). The target uses the same limits as her weight.
export const WEIGHT_GOAL_WEEKS_RANGE = { min: 1, max: 104 } as const;
export const WEIGHT_GOAL_MAX_DAYS_AHEAD = 2 * 366;
/** Within this many kg of her weight the target counts as reached. */
export const TARGET_REACHED_KG = 0.5;

// What each answer rules out (PRD §5.6, 13a+ table). Each list is checked against the food
// diet tags; answers without a tag (keto, fasting, "other") are text for the coach.
export const DIET_TYPE_EXCLUDED_TAGS: Record<DietType, readonly DietTag[]> = {
  none: [],
  vegetarian: ['meat', 'poultry', 'fish', 'shellfish'],
  pescatarian: ['meat', 'poultry'],
  vegan: ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'eggs'],
};

export const RELIGIOUS_EXCLUDED_TAGS: Record<ReligiousId, readonly DietTag[]> = {
  kosher: ['pork', 'shellfish'],
  // Halal slaughter can't be told from a food item — the coach reads her details.
  halal: ['pork', 'alcohol'],
};

export const INTOLERANCE_TAG: Record<IntoleranceId, DietTag | null> = {
  lactose_free: 'lactose',
  gluten_free: 'gluten',
  celiac: 'gluten',
  // Works once the coach tags high-FODMAP items.
  low_fodmap: 'high_fodmap',
  other: null,
};

export const ALLERGY_TAG: Record<AllergyId, DietTag | null> = {
  dairy: 'dairy',
  eggs: 'eggs',
  peanuts: 'peanuts',
  tree_nuts: 'tree_nuts',
  sesame: 'sesame',
  soy: 'soy',
  gluten: 'gluten',
  fish: 'fish',
  shellfish: 'shellfish',
  other: null,
};

/** Kosher: meat (poultry counts as meat) and dairy never in the same option. */
export const KOSHER_MEAT_TAGS: readonly DietTag[] = ['meat', 'poultry'];
export const KOSHER_DAIRY_TAGS: readonly DietTag[] = ['dairy'];

export const NUTRITION_GOAL_IDS = ['fat_loss', 'fat_loss_aggressive', 'recomp', 'muscle_gain', 'maintenance'] as const satisfies readonly NutritionGoal[];
export const FORMULA_SEX_IDS = ['male', 'female'] as const satisfies readonly FormulaSex[];
export const CALORIE_TARGET_SOURCE_IDS = ['suggested', 'override'] as const;

export const LINE_KIND_IDS = ['food', 'text', 'recipe'] as const satisfies readonly NutritionLineKind[];

// Limits for the coach's input.
export const PORTION_STEP = 0.5;
export const MAX_MEAL_PORTIONS = 10;
/** Portions mode: one group's portions over a whole day. */
export const MAX_DAILY_PORTIONS = 30;
export const MAX_LINE_PORTIONS = 10;
export const MAX_MEALS = 10;
export const MAX_MEAL_OPTIONS = 6;
export const MAX_OPTION_LINES = 20;
export const MAX_TIPS = 20;
export const MAX_FOOD_NAME_LENGTH = 120;
export const MAX_FOOD_PORTION_LENGTH = 120;
export const MAX_MEAL_NAME_LENGTH = 60;
export const MAX_OPTION_LABEL_LENGTH = 60;
export const MAX_LINE_TEXT_LENGTH = 200;
export const MAX_TIP_LENGTH = 1000;
export const MAX_INTRO_MESSAGE_LENGTH = 1500;
export const MAX_INTRO_TIP_LENGTH = 300;
export const MAX_TEMPLATE_NAME_LENGTH = 80;
export const MAX_TEMPLATE_DESCRIPTION_LENGTH = 500;
export const MAX_FOOD_GRAMS = 5000;
export const MIN_TARGET_KCAL = 500;
export const MAX_TARGET_KCAL = 6000;
export const MAX_WATER_GOAL_ML = 10000;
/** The coach's daily protein goal: whole grams, 1 to this (owner, 2026-10-28). */
export const MAX_PROTEIN_GRAMS_TARGET = 400;
