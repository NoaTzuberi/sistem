import { Schema } from 'mongoose';
import { FOOD_GROUP_IDS, LINE_KIND_IDS } from './nutrition.constants';
import type { MealFields, MealOptionFields, OptionLineFields, PortionCountsFields, TipFields } from './nutrition.types';

// The meal content shared by NutritionPlan, NutritionPlanVersion and nutrition templates
// (the way plans and templates share planWorkoutSchema), so a template copies into a plan
// as-is. Every meal / option / line keeps a stable _id: 13b meal logs point at meal ids.

export const portionCountsSchema = new Schema<PortionCountsFields>(
  {
    protein: { type: Number, min: 0, default: 0 },
    carb: { type: Number, min: 0, default: 0 },
    fat: { type: Number, min: 0, default: 0 },
    // 13a+ (owner decision): treats, only ever added by the coach.
    snack: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const optionLineSchema = new Schema<OptionLineFields>({
  kind: { type: String, enum: LINE_KIND_IDS, required: true },
  foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem' },
  // 13b (nutritionRecipes).
  recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe' },
  // A food line's group is its item's (copied on save); a text line may count toward one.
  group: { type: String, enum: [...FOOD_GROUP_IDS, null], default: null },
  portions: { type: Number, min: 0, default: null },
  text: { type: String, trim: true },
});

const mealOptionSchema = new Schema<MealOptionFields>({
  label: { type: String, required: true, trim: true },
  lines: { type: [optionLineSchema], default: [] },
});

export const nutritionMealSchema = new Schema<MealFields>({
  name: { type: String, required: true, trim: true },
  portions: { type: portionCountsSchema, required: true, default: () => ({}) },
  vegetablesFree: { type: Boolean, default: false },
  options: { type: [mealOptionSchema], default: [] },
});

export const nutritionTipSchema = new Schema<TipFields>({
  text: { type: String, required: true, trim: true },
});
