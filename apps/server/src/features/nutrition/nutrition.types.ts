import type { Types } from 'mongoose';
import type {
  CalculationOverrides,
  CalorieSuggestion,
  CalorieTargetSource,
  DietTag,
  FoodCategory,
  FoodGroup,
  FormulaSex,
  NutritionGoal,
  NutritionLineKind,
  NutritionPlanMode,
  PortionGroup,
} from '@sistem/types';

export type FoodScope = 'system' | 'coach';

export interface FoodItemDocument {
  /** system = the app-wide bank (no coachId); coach (or missing, before the food bank) = one coach's item. */
  scope?: FoodScope;
  /** Only on coach items. */
  coachId?: Types.ObjectId | null;
  /** A coach's edited copy of a system item (copy-on-write): replaces it in her lists. */
  basedOn?: Types.ObjectId | null;
  /** System items only: stable and unique (seed:nutrition upserts by it). */
  itemKey?: string;
  group: FoodGroup;
  name: string;
  portion: string;
  grams?: number | null;
  kcal?: number | null;
  isNewItem: boolean;
  dietTags: DietTag[];
  category?: FoodCategory | null;
  order: number;
  archivedAt?: Date | null;
  /** Set by seed:nutrition so re-running it never duplicates an item. */
  seedKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PortionCountsFields = Record<PortionGroup, number>;

export interface OptionLineFields {
  _id: Types.ObjectId;
  kind: NutritionLineKind;
  foodItemId?: Types.ObjectId;
  recipeId?: Types.ObjectId;
  group?: FoodGroup | null;
  portions?: number | null;
  text?: string;
}

export interface MealOptionFields {
  _id: Types.ObjectId;
  label: string;
  lines: OptionLineFields[];
}

export interface MealFields {
  _id: Types.ObjectId;
  name: string;
  portions: PortionCountsFields;
  vegetablesFree: boolean;
  options: MealOptionFields[];
}

export interface TipFields {
  _id: Types.ObjectId;
  text: string;
}

export interface FloorConfirmationFields {
  kcal: number;
  floorKcal: number;
  confirmedAt: Date;
}

export type CalculationOverridesFields = Partial<CalculationOverrides>;

export interface CalorieTargetFields {
  kcal?: number | null;
  source?: CalorieTargetSource | null;
  goal: NutritionGoal;
  formulaSex?: FormulaSex | null;
  overrides?: CalculationOverridesFields | null;
  /** The estimate when last saved (inputs included) — Mixed, shape = CalorieSuggestion. */
  suggestion?: CalorieSuggestion | null;
  floorConfirmation?: FloorConfirmationFields | null;
}

export interface NutritionPlanDocument {
  traineeId: Types.ObjectId;
  coachingId: Types.ObjectId;
  coachId: Types.ObjectId;
  calorieTarget: CalorieTargetFields;
  /** null / missing = saved before modes (see nutritionPlanMode.ts). */
  mode?: NutritionPlanMode | null;
  dailyPortions?: PortionCountsFields | null;
  vegetablesFree?: boolean | null;
  meals: MealFields[];
  tips: TipFields[];
  introMessage?: string | null;
  /** 13b (waterTracking). */
  waterGoalMl?: number | null;
  /** The coach's daily protein goal (g); null = none. */
  proteinGramsTarget?: number | null;
  templateId?: Types.ObjectId | null;
  /** 13c: coach-only link to the AI draft the meals came from. */
  aiRecommendationId?: Types.ObjectId | null;
  publishedVersion: number;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionPlanVersionDocument {
  planId: Types.ObjectId;
  traineeId: Types.ObjectId;
  coachingId: Types.ObjectId;
  coachId: Types.ObjectId;
  version: number;
  publishedAt: Date;
  calorieTarget: CalorieTargetFields;
  /** null / missing = saved before modes (see nutritionPlanMode.ts). */
  mode?: NutritionPlanMode | null;
  dailyPortions?: PortionCountsFields | null;
  vegetablesFree?: boolean | null;
  meals: MealFields[];
  tips: TipFields[];
  introMessage?: string | null;
  waterGoalMl?: number | null;
  /** The coach's daily protein goal (g); null = none. */
  proteinGramsTarget?: number | null;
  /** The group values and kcal at publish time, so a later config change never rewrites history. */
  groupKcal: Record<FoodGroup, number>;
  mealKcal: { mealId: Types.ObjectId; kcal: number }[];
  dayKcal: number;
  createdAt: Date;
}

export interface NutritionSettingsDocument {
  coachId: Types.ObjectId;
  groupKcal?: Partial<PortionCountsFields>;
  goalAdjustments?: Partial<Record<NutritionGoal, number>>;
  activityFactors?: number[];
  floorKcal?: number;
  kcalPerKg?: number;
  maxLossRatePctPerWeek?: number;
  maxGainRatePctPerWeek?: number;
  maxDeficitPct?: number;
  portionSplit?: Partial<PortionCountsFields>;
  ketoMaxCarbPortions?: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- 13b (closed behind feature flags; designed in 13a, used from 13b). The MealLog moved
// to features/mealLogs when portion tracking opened (13a+). -----------------------

export interface RecipeIngredientFields {
  _id: Types.ObjectId;
  kind: 'food' | 'text';
  foodItemId?: Types.ObjectId;
  group?: FoodGroup | null;
  portions?: number | null;
  text?: string;
}

export interface RecipeDocument {
  coachId: Types.ObjectId;
  name: string;
  ingredients: RecipeIngredientFields[];
  steps: string[];
  notes?: string;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaterLogDocument {
  traineeId: Types.ObjectId;
  date: string;
  totalMl: number;
  createdAt: Date;
  updatedAt: Date;
}
