import { Schema, model } from 'mongoose';
import { coachingIdField, fillCoachingFromPair } from '../coachings/coachingRef';
import { CALORIE_TARGET_SOURCE_IDS, FORMULA_SEX_IDS, NUTRITION_GOAL_IDS, NUTRITION_PLAN_MODE_IDS } from './nutrition.constants';
import { nutritionMealSchema, nutritionTipSchema, portionCountsSchema } from './nutritionMeal.schema';
import type {
  CalculationOverridesFields,
  CalorieTargetFields,
  FloorConfirmationFields,
  NutritionPlanDocument,
  NutritionPlanVersionDocument,
} from './nutrition.types';

// One current nutrition plan per trainee (not weekly, PRD §5.6). This document is the
// coach's working copy — autosaved, never seen by the trainee. Each publish freezes a
// NutritionPlanVersion; the trainee always reads the newest version.

const floorConfirmationSchema = new Schema<FloorConfirmationFields>(
  {
    kcal: { type: Number, required: true },
    floorKcal: { type: Number, required: true },
    confirmedAt: { type: Date, required: true },
  },
  { _id: false },
);

// The coach's own values in the calculation summary; null = her data.
const calculationOverridesSchema = new Schema<CalculationOverridesFields>(
  {
    weightKg: { type: Number, default: null },
    heightCm: { type: Number, default: null },
    ageYears: { type: Number, default: null },
    activityFactor: { type: Number, default: null },
    targetWeightKg: { type: Number, default: null },
    timelineWeeks: { type: Number, default: null },
  },
  { _id: false },
);

const calorieTargetSchema = new Schema<CalorieTargetFields>(
  {
    kcal: { type: Number, min: 0, default: null },
    source: { type: String, enum: [...CALORIE_TARGET_SOURCE_IDS, null], default: null },
    goal: { type: String, enum: NUTRITION_GOAL_IDS, required: true },
    formulaSex: { type: String, enum: [...FORMULA_SEX_IDS, null], default: null },
    overrides: { type: calculationOverridesSchema, default: () => ({}) },
    suggestion: { type: Schema.Types.Mixed, default: null },
    // A target below the floor needs this, for that exact kcal (checked on publish).
    floorConfirmation: { type: floorConfirmationSchema, default: null },
  },
  { _id: false },
);

const nutritionPlanSchema = new Schema<NutritionPlanDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // ONE working copy per coaching (was per trainee): the coach reads it only through it.
    coachingId: { ...coachingIdField, unique: true },
    calorieTarget: { type: calorieTargetSchema, required: true },
    // null = saved before modes (nutritionPlanMode.ts decides on read).
    mode: { type: String, enum: [...NUTRITION_PLAN_MODE_IDS, null], default: null },
    dailyPortions: { type: portionCountsSchema, default: null },
    vegetablesFree: { type: Boolean, default: null },
    meals: { type: [nutritionMealSchema], default: [] },
    tips: { type: [nutritionTipSchema], default: [] },
    // The coach's note at the top of her Nutrition tab (plain text, line breaks kept).
    introMessage: { type: String, default: null },
    // Her short tip shown under the note (a card "Tip from <coach>"); null = none.
    introTip: { type: String, default: null },
    waterGoalMl: { type: Number, min: 0, default: null },
    // The coach's daily protein goal in grams (owner, 2026-10-28); null = none.
    proteinGramsTarget: { type: Number, min: 1, default: null },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template', default: null },
    // The AI nutrition draft the meals were loaded from (13c). Coach-only: never copied
    // into a version, never sent to the trainee.
    aiRecommendationId: { type: Schema.Types.ObjectId, ref: 'AiRecommendation', default: null },
    publishedVersion: { type: Number, min: 0, default: 0 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

fillCoachingFromPair(nutritionPlanSchema);
nutritionPlanSchema.index({ coachId: 1, updatedAt: -1 });
nutritionPlanSchema.index({ traineeId: 1 });

export const NutritionPlan = model<NutritionPlanDocument>('NutritionPlan', nutritionPlanSchema);

const nutritionPlanVersionSchema = new Schema<NutritionPlanVersionDocument>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'NutritionPlan', required: true },
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachingId: coachingIdField,
    version: { type: Number, required: true, min: 1 },
    publishedAt: { type: Date, required: true },
    calorieTarget: { type: calorieTargetSchema, required: true },
    mode: { type: String, enum: [...NUTRITION_PLAN_MODE_IDS, null], default: null },
    dailyPortions: { type: portionCountsSchema, default: null },
    vegetablesFree: { type: Boolean, default: null },
    // Kept in portions mode too: the meal photo slots (13a+) use their names.
    meals: { type: [nutritionMealSchema], default: [] },
    tips: { type: [nutritionTipSchema], default: [] },
    // The note + tip as sent (raw: {name} is filled on read, so a later default never changes it).
    introMessage: { type: String, default: null },
    introTip: { type: String, default: null },
    waterGoalMl: { type: Number, min: 0, default: null },
    // The coach's daily protein goal in grams (owner, 2026-10-28); null = none.
    proteinGramsTarget: { type: Number, min: 1, default: null },
    groupKcal: { type: Schema.Types.Mixed, required: true },
    mealKcal: {
      type: [new Schema({ mealId: Schema.Types.ObjectId, kcal: Number }, { _id: false })],
      default: [],
    },
    dayKcal: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// The unique pair makes two publishes at once produce one version each, never a clash.
nutritionPlanVersionSchema.index({ planId: 1, version: 1 }, { unique: true });
nutritionPlanVersionSchema.index({ traineeId: 1, version: -1 });
nutritionPlanVersionSchema.index({ coachingId: 1, version: -1 });
fillCoachingFromPair(nutritionPlanVersionSchema);

export const NutritionPlanVersion = model<NutritionPlanVersionDocument>('NutritionPlanVersion', nutritionPlanVersionSchema);
