import mongoose from 'mongoose';
import type {
  Language,
  ApplyNutritionTemplatePayload,
  CalculationOverrides,
  CreateNutritionTemplatePayload,
  RenameNutritionTemplatePayload,
  DietTag,
  FoodGroup,
  FoodItem,
  FoodItemPayload,
  NutritionConfig,
  NutritionFeatures,
  NutritionIssue,
  NutritionKcal,
  NutritionMeal,
  NutritionOptionLineInput,
  NutritionPlanMode,
  NutritionPreferences,
  NutritionSettingsPayload,
  PortionCounts,
  SaveNutritionPlanPayload,
} from '@sistem/types';
import {
  CALORIE_TARGET_SOURCE_IDS,
  DIET_TAG_IDS,
  FOOD_CATEGORY_IDS,
  FOOD_GROUP_IDS,
  FORMULA_SEX_IDS,
  LINE_KIND_IDS,
  MAX_FOOD_GRAMS,
  MAX_FOOD_NAME_LENGTH,
  MAX_FOOD_PORTION_LENGTH,
  MAX_INTRO_MESSAGE_LENGTH,
  MAX_LINE_PORTIONS,
  MAX_LINE_TEXT_LENGTH,
  MAX_MEALS,
  MAX_MEAL_NAME_LENGTH,
  MAX_MEAL_OPTIONS,
  MAX_DAILY_PORTIONS,
  MAX_MEAL_PORTIONS,
  NUTRITION_PLAN_MODE_IDS,
  MAX_OPTION_LABEL_LENGTH,
  MAX_OPTION_LINES,
  MAX_TARGET_KCAL,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TIPS,
  MAX_TIP_LENGTH,
  MAX_WATER_GOAL_ML,
  MAX_PROTEIN_GRAMS_TARGET,
  MIN_TARGET_KCAL,
  NUTRITION_GOAL_IDS,
  PORTION_GROUP_IDS,
  PORTION_STEP,
  WEIGHT_GOAL_WEEKS_RANGE,
} from './nutrition.constants';
import { NUTRITION_SETTING_BOUNDS } from './nutrition.config';
import { findFoodConflicts, followsKeto, hasKetoConflict, hasKosherConflict, keepsKosher } from './nutritionPreferences';
import type { FoodConflictReason } from './nutritionPreferences';
import { msg, translate, type MessageCode, type ServerMessage } from '../../i18n';

// Nutrition plan rules live only here, on the server (like plan.validation.ts): the
// dashboard shows `issues` next to the meal / option / line they point at and never
// re-checks a plan itself. Save = shape and limits; publish = the plan makes sense.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

/** An optional id: kept only when it could be a real one (unknown ids get a new id). */
function optionalId(value: unknown): string | undefined {
  return isObjectId(value) ? value : undefined;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** 0, 0.5, 1, … up to max. */
export function isPortionCount(value: unknown, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max &&
    Number.isInteger(value / PORTION_STEP)
  );
}

function trimmedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

export function validateIdParam(id: unknown, label: string): ServerMessage | null {
  return isObjectId(id) ? null : msg('id_invalid', { label });
}

// ---------------------------------------------------------------------------
// Food items
// ---------------------------------------------------------------------------

type FoodItemParse = { value: FoodItemPayload; error: null } | { value: null; error: ServerMessage };

/**
 * POST (`partial` = false: group, name and portion required) and PATCH (any subset).
 * The kcal cap depends on the coach's config and the item's group, so the service checks it.
 */
export function parseFoodItemPayload(body: unknown, partial: boolean): FoodItemParse {
  if (!isRecord(body)) return { value: null, error: msg('invalid_body') };
  const value: FoodItemPayload = {};

  if (body.group !== undefined || !partial) {
    if (!isOneOf(body.group, FOOD_GROUP_IDS)) return { value: null, error: msg('food_group_invalid') };
    value.group = body.group;
  }
  if (body.name !== undefined || !partial) {
    const name = trimmedText(body.name, MAX_FOOD_NAME_LENGTH);
    if (!name) return { value: null, error: msg('food_name_required', { max: MAX_FOOD_NAME_LENGTH }) };
    value.name = name;
  }
  if (body.portion !== undefined || !partial) {
    const portion = trimmedText(body.portion, MAX_FOOD_PORTION_LENGTH);
    if (!portion) return { value: null, error: msg('food_portion_required', { max: MAX_FOOD_PORTION_LENGTH }) };
    value.portion = portion;
  }
  if (body.grams !== undefined) {
    if (body.grams !== null && !(typeof body.grams === 'number' && body.grams > 0 && body.grams <= MAX_FOOD_GRAMS)) {
      return { value: null, error: msg('food_grams_invalid', { max: MAX_FOOD_GRAMS }) };
    }
    value.grams = body.grams;
  }
  if (body.kcal !== undefined) {
    if (body.kcal !== null && !(typeof body.kcal === 'number' && Number.isFinite(body.kcal) && body.kcal >= 0)) {
      return { value: null, error: msg('food_kcal_invalid') };
    }
    value.kcal = body.kcal;
  }
  if (body.isNew !== undefined) {
    if (typeof body.isNew !== 'boolean') return { value: null, error: msg('food_is_new_invalid') };
    value.isNew = body.isNew;
  }
  if (body.dietTags !== undefined) {
    if (!Array.isArray(body.dietTags) || !body.dietTags.every((tag) => isOneOf(tag, DIET_TAG_IDS))) {
      return { value: null, error: msg('food_diet_tags_invalid') };
    }
    value.dietTags = [...new Set(body.dietTags as DietTag[])];
  }
  if (body.category !== undefined) {
    // Which group it must belong to is checked in the service (the group may come from the item).
    const known = Object.values(FOOD_CATEGORY_IDS).some((ids) => (ids as readonly unknown[]).includes(body.category));
    if (body.category !== null && !known) return { value: null, error: msg('food_category_unknown') };
    value.category = body.category as FoodItemPayload['category'];
  }
  if (body.order !== undefined) {
    if (typeof body.order !== 'number' || !Number.isInteger(body.order) || body.order < 0) {
      return { value: null, error: msg('food_order_invalid') };
    }
    value.order = body.order;
  }
  if (partial && Object.keys(value).length === 0) return { value: null, error: msg('food_nothing_to_change') };
  return { value, error: null };
}

/** null = fine; else why this kcal is above the group's cap (or a vegetable has kcal). */
export function foodKcalProblem(group: FoodGroup, kcal: number | null | undefined, config: NutritionConfig): ServerMessage | null {
  if (kcal === null || kcal === undefined) return null;
  const cap = config.groupKcal[group];
  if (kcal > cap) {
    return group === 'vegetable' ? msg('food_vegetable_kcal') : msg('food_kcal_above_cap', { group: msg(`group_${group}`), cap });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

type SettingsParse = { value: NutritionSettingsPayload; error: null } | { value: null; error: ServerMessage };

function inRange(value: unknown, { min, max }: { min: number; max: number }): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** One number per portion group (already checked). */
function countsOf(record: Record<string, unknown>): PortionCounts {
  return Object.fromEntries(PORTION_GROUP_IDS.map((group) => [group, record[group] as number])) as unknown as PortionCounts;
}

export function parseNutritionSettingsPayload(body: unknown): SettingsParse {
  if (!isRecord(body)) return { value: null, error: msg('invalid_body') };
  const { groupKcal, goalAdjustments, activityFactors, floorKcal, portionSplit } = body;
  const bounds = NUTRITION_SETTING_BOUNDS;

  if (!isRecord(groupKcal) || !PORTION_GROUP_IDS.every((group) => inRange(groupKcal[group], bounds.groupKcal))) {
    return { value: null, error: msg('settings_group_kcal_range', bounds.groupKcal) };
  }
  if (
    !isRecord(goalAdjustments) ||
    !NUTRITION_GOAL_IDS.every((goal) => inRange(goalAdjustments[goal], bounds.goalAdjustmentPct))
  ) {
    return {
      value: null,
      error: msg('settings_goal_range', bounds.goalAdjustmentPct),
    };
  }
  if (
    !Array.isArray(activityFactors) ||
    activityFactors.length !== 7 ||
    !activityFactors.every((factor) => inRange(factor, bounds.activityFactor))
  ) {
    return {
      value: null,
      error: msg('settings_activity_range', bounds.activityFactor),
    };
  }
  if (!inRange(floorKcal, bounds.floorKcal) || !Number.isInteger(floorKcal)) {
    return { value: null, error: msg('settings_floor_range', bounds.floorKcal) };
  }
  const scalars = [
    ['kcalPerKg', bounds.kcalPerKg, msg('settings_label_kcal_per_kg')],
    ['maxLossRatePctPerWeek', bounds.lossRatePct, msg('settings_label_loss_rate')],
    ['maxGainRatePctPerWeek', bounds.gainRatePct, msg('settings_label_gain_rate')],
    ['maxDeficitPct', bounds.maxDeficitPct, msg('settings_label_max_deficit')],
    ['ketoMaxCarbPortions', bounds.ketoMaxCarbPortions, msg('settings_label_keto_carbs')],
  ] as const;
  for (const [key, range, label] of scalars) {
    if (!inRange(body[key], range)) return { value: null, error: msg('settings_value_range', { label, min: range.min, max: range.max }) };
  }
  if (
    !isRecord(portionSplit) ||
    !PORTION_GROUP_IDS.every((group) => inRange(portionSplit[group], bounds.portionSplitPct)) ||
    Math.abs(PORTION_GROUP_IDS.reduce((sum, group) => sum + (portionSplit[group] as number), 0) - 100) > 0.01
  ) {
    return { value: null, error: msg('settings_portion_split') };
  }
  return {
    value: {
      groupKcal: countsOf(groupKcal),
      goalAdjustments: Object.fromEntries(NUTRITION_GOAL_IDS.map((goal) => [goal, goalAdjustments[goal] as number])) as NutritionSettingsPayload['goalAdjustments'],
      activityFactors: activityFactors as number[],
      floorKcal,
      kcalPerKg: body.kcalPerKg as number,
      maxLossRatePctPerWeek: body.maxLossRatePctPerWeek as number,
      maxGainRatePctPerWeek: body.maxGainRatePctPerWeek as number,
      maxDeficitPct: body.maxDeficitPct as number,
      portionSplit: countsOf(portionSplit),
      ketoMaxCarbPortions: body.ketoMaxCarbPortions as number,
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Nutrition plan — save payload (the coach's working copy, autosaved)
// ---------------------------------------------------------------------------

type PlanParse = { value: SaveNutritionPlanPayload; issues: [] } | { value: null; issues: NutritionProblem[] };

/** A NutritionIssue whose message is still a code — worded per response (localizeNutritionIssues). */
export type NutritionProblem = Omit<NutritionIssue, 'message'> & { message: ServerMessage };

function invalid(message: ServerMessage, at: Partial<Pick<NutritionIssue, 'mealIndex' | 'optionIndex' | 'lineIndex'>> = {}): NutritionProblem {
  return { severity: 'error', code: 'invalid', message, ...at };
}

export function localizeNutritionIssues(problems: readonly NutritionProblem[], language: Language): NutritionIssue[] {
  return problems.map((problem) => ({ ...problem, message: translate(language, problem.message) }));
}

// The coach's values in the calculation summary — wide limits, like her onboarding answers.
const OVERRIDE_BOUNDS: Record<keyof CalculationOverrides, { min: number; max: number; integer?: boolean; label: MessageCode }> = {
  weightKg: { min: 20, max: 400, label: 'overrides_label_weight' },
  heightCm: { min: 50, max: 300, label: 'overrides_label_height' },
  ageYears: { min: 5, max: 120, integer: true, label: 'overrides_label_age' },
  activityFactor: { ...NUTRITION_SETTING_BOUNDS.activityFactor, label: 'overrides_label_activity' },
  targetWeightKg: { min: 20, max: 400, label: 'overrides_label_target_weight' },
  timelineWeeks: { ...WEIGHT_GOAL_WEEKS_RANGE, integer: true, label: 'overrides_label_timeline' },
};

/** Each override a number in its range, or null (her data). Missing keys = null. */
export function parseCalculationOverrides(value: unknown): { value: CalculationOverrides; error: null } | { value: null; error: ServerMessage } {
  if (!isRecord(value)) return { value: null, error: msg('overrides_invalid') };
  const overrides = {} as CalculationOverrides;
  for (const [key, bounds] of Object.entries(OVERRIDE_BOUNDS) as [keyof CalculationOverrides, (typeof OVERRIDE_BOUNDS)[keyof CalculationOverrides]][]) {
    const raw = value[key] ?? null;
    if (raw !== null && (!inRange(raw, bounds) || (bounds.integer && !Number.isInteger(raw)))) {
      return { value: null, error: msg('settings_value_range', { label: msg(bounds.label), min: bounds.min, max: bounds.max }) };
    }
    overrides[key] = raw as number | null;
  }
  return { value: overrides, error: null };
}

function parsePortionCounts(value: unknown, max: number = MAX_MEAL_PORTIONS): PortionCounts | null {
  if (!isRecord(value)) return null;
  const counts = {} as PortionCounts;
  for (const group of PORTION_GROUP_IDS) {
    const count = value[group] ?? 0;
    if (!isPortionCount(count, max)) return null;
    counts[group] = count;
  }
  return counts;
}

/**
 * PUT /coach/trainees/:id/nutrition-plan. Shape, limits and the closed features only —
 * whether the plan can be published is findNutritionPublishIssues().
 */
export function parseSaveNutritionPlanPayload(body: unknown, features: NutritionFeatures): PlanParse {
  if (!isRecord(body)) return { value: null, issues: [invalid(msg('invalid_body'))] };
  const issues: NutritionProblem[] = [];

  // Calorie target.
  const target = body.calorieTarget;
  let calorieTarget: SaveNutritionPlanPayload['calorieTarget'] | null = null;
  if (!isRecord(target)) {
    issues.push(invalid(msg('nutrition_target_missing_field')));
  } else {
    const kcal = target.kcal ?? null;
    const source = target.source ?? null;
    const formulaSex = target.formulaSex ?? null;
    // Omitted = keep the stored ones.
    const overrides = target.overrides !== undefined ? parseCalculationOverrides(target.overrides) : null;
    if (kcal !== null && !(typeof kcal === 'number' && Number.isInteger(kcal) && kcal >= MIN_TARGET_KCAL && kcal <= MAX_TARGET_KCAL)) {
      issues.push(invalid(msg('nutrition_target_range', { min: MIN_TARGET_KCAL, max: MAX_TARGET_KCAL })));
    } else if (source !== null && !isOneOf(source, CALORIE_TARGET_SOURCE_IDS)) {
      issues.push(invalid(msg('nutrition_target_source_invalid')));
    } else if (!isOneOf(target.goal, NUTRITION_GOAL_IDS)) {
      issues.push(invalid(msg('nutrition_goal_invalid')));
    } else if (formulaSex !== null && !isOneOf(formulaSex, FORMULA_SEX_IDS)) {
      issues.push(invalid(msg('nutrition_formula_invalid')));
    } else if (target.confirmBelowFloor !== undefined && typeof target.confirmBelowFloor !== 'boolean') {
      issues.push(invalid(msg('nutrition_floor_flag_invalid')));
    } else if (overrides?.error) {
      issues.push(invalid(overrides.error));
    } else {
      calorieTarget = {
        ...(overrides?.value ? { overrides: overrides.value } : {}),
        kcal: kcal as number | null,
        // A target without a number has no source.
        source: kcal === null ? null : ((source ?? 'override') as 'suggested' | 'override'),
        goal: target.goal,
        formulaSex: formulaSex as 'male' | 'female' | null,
        confirmBelowFloor: target.confirmBelowFloor === true,
      };
    }
  }

  // Meals → options → lines.
  const meals: SaveNutritionPlanPayload['meals'] = [];
  if (!Array.isArray(body.meals)) {
    issues.push(invalid(msg('nutrition_meals_not_list')));
  } else if (body.meals.length > MAX_MEALS) {
    issues.push(invalid(msg('nutrition_too_many_meals', { max: MAX_MEALS })));
  } else {
    body.meals.forEach((rawMeal, mealIndex) => {
      if (!isRecord(rawMeal)) {
        issues.push(invalid(msg('nutrition_meal_invalid'), { mealIndex }));
        return;
      }
      const name = trimmedText(rawMeal.name, MAX_MEAL_NAME_LENGTH);
      const portions = parsePortionCounts(rawMeal.portions);
      if (!name) issues.push(invalid(msg('nutrition_meal_name_required', { max: MAX_MEAL_NAME_LENGTH }), { mealIndex }));
      if (!portions) {
        issues.push(invalid(msg('nutrition_meal_portion_step', { step: PORTION_STEP, max: MAX_MEAL_PORTIONS }), { mealIndex }));
      }
      const rawOptions = rawMeal.options ?? [];
      if (!Array.isArray(rawOptions) || rawOptions.length > MAX_MEAL_OPTIONS) {
        issues.push(invalid(msg('nutrition_too_many_options', { max: MAX_MEAL_OPTIONS }), { mealIndex }));
        return;
      }
      const options = rawOptions.flatMap((rawOption: unknown, optionIndex: number) => {
        if (!isRecord(rawOption)) {
          issues.push(invalid(msg('nutrition_option_invalid'), { mealIndex, optionIndex }));
          return [];
        }
        const label = trimmedText(rawOption.label, MAX_OPTION_LABEL_LENGTH);
        if (!label) {
          issues.push(invalid(msg('nutrition_option_label_required', { max: MAX_OPTION_LABEL_LENGTH }), { mealIndex, optionIndex }));
        }
        const rawLines = rawOption.lines ?? [];
        if (!Array.isArray(rawLines) || rawLines.length > MAX_OPTION_LINES) {
          issues.push(invalid(msg('nutrition_too_many_lines', { max: MAX_OPTION_LINES }), { mealIndex, optionIndex }));
          return [];
        }
        const lines = rawLines.flatMap((rawLine: unknown, lineIndex: number): NutritionOptionLineInput[] => {
          const at = { mealIndex, optionIndex, lineIndex };
          if (!isRecord(rawLine) || !isOneOf(rawLine.kind, LINE_KIND_IDS)) {
            issues.push(invalid(msg('nutrition_line_kind_invalid'), at));
            return [];
          }
          const portionsValue = rawLine.portions ?? null;
          const id = optionalId(rawLine.id);
          if (rawLine.kind === 'food') {
            if (!isObjectId(rawLine.foodItemId)) {
              issues.push(invalid(msg('nutrition_line_food_required'), at));
              return [];
            }
            if (!isPortionCount(portionsValue, MAX_LINE_PORTIONS) || portionsValue === 0) {
              issues.push(invalid(msg('nutrition_line_portion_step', { step: PORTION_STEP, max: MAX_LINE_PORTIONS }), at));
              return [];
            }
            return [{ id, kind: 'food' as const, foodItemId: rawLine.foodItemId, portions: portionsValue }];
          }
          if (rawLine.kind === 'recipe') {
            if (!features.nutritionRecipes) {
              issues.push(invalid(msg('nutrition_recipes_unavailable'), at));
              return [];
            }
            if (!isObjectId(rawLine.recipeId) || !isPortionCount(portionsValue, MAX_LINE_PORTIONS) || portionsValue === 0) {
              issues.push(invalid(msg('nutrition_line_recipe_required'), at));
              return [];
            }
            return [{ id, kind: 'recipe' as const, recipeId: rawLine.recipeId, portions: portionsValue }];
          }
          // Free text, e.g. "cut vegetables — free", or a food the list doesn't have (counted in a group).
          const text = trimmedText(rawLine.text, MAX_LINE_TEXT_LENGTH);
          const group = rawLine.group ?? null;
          if (!text) {
            issues.push(invalid(msg('nutrition_line_text_required', { max: MAX_LINE_TEXT_LENGTH }), at));
            return [];
          }
          if (group !== null && !isOneOf(group, FOOD_GROUP_IDS)) {
            issues.push(invalid(msg('nutrition_line_group_invalid'), at));
            return [];
          }
          const counted = group !== null && group !== 'vegetable';
          if (counted && (!isPortionCount(portionsValue, MAX_LINE_PORTIONS) || portionsValue === 0)) {
            issues.push(invalid(msg('nutrition_line_text_portion_step', { step: PORTION_STEP }), at));
            return [];
          }
          return [{ id, kind: 'text' as const, text, group: group as FoodGroup | null, portions: counted ? (portionsValue as number) : null }];
        });
        return label ? [{ id: optionalId(rawOption.id), label, lines }] : [];
      });
      if (name && portions) {
        meals.push({ id: optionalId(rawMeal.id), name, portions, vegetablesFree: rawMeal.vegetablesFree === true, options });
      }
    });
  }

  // Tips.
  const tips: SaveNutritionPlanPayload['tips'] = [];
  const rawTips = body.tips ?? [];
  if (!Array.isArray(rawTips) || rawTips.length > MAX_TIPS) {
    issues.push(invalid(msg('nutrition_too_many_tips', { max: MAX_TIPS })));
  } else {
    for (const rawTip of rawTips) {
      const text = isRecord(rawTip) ? trimmedText(rawTip.text, MAX_TIP_LENGTH) : null;
      if (!text) {
        issues.push(invalid(msg('nutrition_tip_required', { max: MAX_TIP_LENGTH })));
        continue;
      }
      tips.push({ id: optionalId((rawTip as Record<string, unknown>).id), text });
    }
  }

  // 13b: water goal, only while the feature is open.
  let waterGoalMl: number | null | undefined;
  if (body.waterGoalMl !== undefined) {
    if (!features.waterTracking) {
      issues.push(invalid(msg('nutrition_water_unavailable')));
    } else if (
      body.waterGoalMl !== null &&
      !(typeof body.waterGoalMl === 'number' && Number.isInteger(body.waterGoalMl) && body.waterGoalMl >= 0 && body.waterGoalMl <= MAX_WATER_GOAL_ML)
    ) {
      issues.push(invalid(msg('nutrition_water_goal_invalid', { max: MAX_WATER_GOAL_ML })));
    } else {
      waterGoalMl = body.waterGoalMl as number | null;
    }
  }

  // The coach's daily protein goal (whole grams; null clears, omitted keeps).
  let proteinGramsTarget: number | null | undefined;
  if (body.proteinGramsTarget !== undefined) {
    const value = body.proteinGramsTarget;
    if (value === null) proteinGramsTarget = null;
    else if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_PROTEIN_GRAMS_TARGET) proteinGramsTarget = value;
    else issues.push(invalid(msg('nutrition_protein_target_invalid', { max: MAX_PROTEIN_GRAMS_TARGET })));
  }

  // The coach's intro: plain text, line breaks kept (only the ends are trimmed).
  let introMessage: string | null | undefined;
  if (body.introMessage !== undefined) {
    if (body.introMessage === null) introMessage = null;
    else if (typeof body.introMessage !== 'string' || body.introMessage.trim().length > MAX_INTRO_MESSAGE_LENGTH) {
      issues.push(invalid(msg('nutrition_intro_too_long', { max: MAX_INTRO_MESSAGE_LENGTH })));
    } else {
      introMessage = body.introMessage.replace(/\r\n/g, '\n').trim() || null;
    }
  }

  // Plan mode (owner, 2026-10-20): omitted keeps; the daily portions in ½ steps.
  let mode: NutritionPlanMode | undefined;
  if (body.mode !== undefined) {
    if (isOneOf(body.mode, NUTRITION_PLAN_MODE_IDS)) mode = body.mode;
    else issues.push(invalid(msg('invalid_body')));
  }
  let dailyPortions: PortionCounts | undefined;
  if (body.dailyPortions !== undefined) {
    const parsed = parsePortionCounts(body.dailyPortions, MAX_DAILY_PORTIONS);
    if (parsed) dailyPortions = parsed;
    else issues.push(invalid(msg('nutrition_daily_portions_invalid', { max: MAX_DAILY_PORTIONS })));
  }
  let vegetablesFree: boolean | undefined;
  if (body.vegetablesFree !== undefined) {
    if (typeof body.vegetablesFree === 'boolean') vegetablesFree = body.vegetablesFree;
    else issues.push(invalid(msg('invalid_body')));
  }

  // 13c: the AI draft the meals came from (string links, null clears, omitted keeps).
  let aiRecommendationId: string | null | undefined;
  if (body.aiRecommendationId === null) aiRecommendationId = null;
  else if (body.aiRecommendationId !== undefined) {
    if (isObjectId(body.aiRecommendationId)) aiRecommendationId = body.aiRecommendationId;
    else issues.push(invalid(msg('nutrition_ai_id_invalid')));
  }

  if (issues.length > 0 || !calorieTarget) {
    return { value: null, issues: issues.length > 0 ? issues : [invalid(msg('invalid_body'))] };
  }
  return {
    value: {
      calorieTarget,
      meals,
      tips,
      ...(mode !== undefined ? { mode } : {}),
      ...(dailyPortions !== undefined ? { dailyPortions } : {}),
      ...(vegetablesFree !== undefined ? { vegetablesFree } : {}),
      ...(waterGoalMl !== undefined ? { waterGoalMl } : {}),
      ...(proteinGramsTarget !== undefined ? { proteinGramsTarget } : {}),
      ...(introMessage !== undefined ? { introMessage } : {}),
      ...(aiRecommendationId !== undefined ? { aiRecommendationId } : {}),
    },
    issues: [],
  };
}

// ---------------------------------------------------------------------------
// Publish rules and kcal
// ---------------------------------------------------------------------------

/** Meal kcal = its portions × the group values (never from individual foods, PRD §5.6). */
export function computeNutritionKcal(
  meals: readonly Pick<NutritionMeal, 'id' | 'portions'>[],
  groupKcal: NutritionConfig['groupKcal'],
): NutritionKcal {
  const mealKcal = meals.map((meal) => ({
    mealId: meal.id,
    kcal: Math.round(PORTION_GROUP_IDS.reduce((sum, group) => sum + meal.portions[group] * groupKcal[group], 0)),
  }));
  return { meals: mealKcal, day: mealKcal.reduce((sum, meal) => sum + meal.kcal, 0) };
}

export interface PublishCheckInput {
  calorieTarget: { kcal: number | null; floorConfirmation: { kcal: number } | null };
  /** Omitted = menu (the meals are what she gets). */
  mode?: NutritionPlanMode;
  /** Portions mode's day. */
  dailyPortions?: PortionCounts;
  meals: NutritionMeal[];
}

export interface PublishCheckContext {
  /** The coach's food list (archived included). A missing id = not hers / deleted. */
  foods: Map<string, Pick<FoodItem, 'group' | 'name' | 'archivedAt' | 'dietTags'>>;
  config: NutritionConfig;
  preferences: NutritionPreferences | null;
  features: NutritionFeatures;
  /** Recipe ids that exist, are hers and not archived (13b; empty while closed). */
  recipeIds: Set<string>;
}

// Coach-facing wording for a conflict (placeholder, like the rest): the tag and the answer behind it.
function describeConflict(reason: FoodConflictReason): ServerMessage {
  const tag = msg(`tag_${reason.tag}` as MessageCode);
  if (reason.kind === 'allergy') return msg('conflict_allergy', { tag });
  return msg('conflict_preference', { tag, source: msg(`source_${reason.source}` as MessageCode) });
}

/** The meals' portions summed over the day. */
export function sumDayPortions(meals: readonly Pick<NutritionMeal, 'portions'>[]): PortionCounts {
  const total: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };
  for (const meal of meals) for (const group of PORTION_GROUP_IDS) total[group] += meal.portions[group];
  return total;
}

/**
 * Errors block publishing; warnings are shown and don't. Every problem points at the
 * meal / option / line it belongs to.
 */
export function findNutritionPublishIssues(plan: PublishCheckInput, context: PublishCheckContext): NutritionProblem[] {
  const issues: NutritionProblem[] = [];
  const { foods, config, preferences } = context;
  const { kcal, floorConfirmation } = plan.calorieTarget;

  if (kcal === null) {
    issues.push({ severity: 'error', code: 'target_missing', message: msg('target_missing') });
  } else if (kcal < config.floorKcal && floorConfirmation?.kcal !== kcal) {
    issues.push({
      severity: 'error',
      code: 'floor_unconfirmed',
      message: msg('below_floor_unconfirmed', { floor: config.floorKcal }),
    });
  }
  // Portions mode: she gets the daily portions and picks the foods herself — the meals aren't published to her.
  if (plan.mode === 'portions') {
    const day = plan.dailyPortions ?? { protein: 0, carb: 0, fat: 0, snack: 0 };
    if (PORTION_GROUP_IDS.every((group) => day[group] === 0)) {
      issues.push({ severity: 'error', code: 'no_portions', message: msg('no_daily_portions') });
    }
    if (followsKeto(preferences) && hasKetoConflict(day, config.ketoMaxCarbPortions)) {
      issues.push({
        severity: 'warning',
        code: 'keto_conflict',
        message: msg('keto_carb_portions', { count: day.carb + day.snack, limit: config.ketoMaxCarbPortions }),
      });
    }
    return issues;
  }

  if (plan.meals.length === 0) {
    issues.push({ severity: 'error', code: 'no_meals', message: msg('no_meals') });
  }

  plan.meals.forEach((meal, mealIndex) => {
    const mealPortions = PORTION_GROUP_IDS.reduce((sum, group) => sum + meal.portions[group], 0);
    if (mealPortions === 0) {
      issues.push({ severity: 'warning', code: 'meal_no_portions', message: msg('meal_no_portions', { meal: meal.name }), mealIndex });
    }

    meal.options.forEach((option, optionIndex) => {
      const where = `${meal.name} · ${option.label}`;
      if (option.lines.length === 0) {
        issues.push({ severity: 'error', code: 'option_empty', message: msg('option_empty', { where }), mealIndex, optionIndex });
        return;
      }

      const totals: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };
      const optionTags: DietTag[][] = [];
      option.lines.forEach((line, lineIndex) => {
        const at = { mealIndex, optionIndex, lineIndex };
        if (line.kind === 'recipe') {
          if (!context.features.nutritionRecipes || !line.recipeId || !context.recipeIds.has(line.recipeId)) {
            issues.push({ severity: 'error', code: 'recipe_unavailable', message: msg('recipe_unavailable', { where }), ...at });
          }
          return;
        }
        if (line.kind === 'text') {
          if (line.group && line.group !== 'vegetable' && line.portions) totals[line.group] += line.portions;
          return;
        }
        const food = line.foodItemId ? foods.get(line.foodItemId) : undefined;
        if (!food) {
          issues.push({ severity: 'error', code: 'food_missing', message: msg('food_missing', { where }), ...at });
          return;
        }
        if (food.archivedAt) {
          issues.push({ severity: 'error', code: 'food_archived', message: msg('food_archived', { where, food: food.name }), ...at });
        }
        if (line.group !== food.group) {
          issues.push({
            severity: 'error',
            code: 'food_group_mismatch',
            message: msg('food_group_changed', { where, food: food.name, group: msg(`group_${food.group}`) }),
            ...at,
          });
        }
        if (food.group !== 'vegetable' && line.portions) totals[food.group] += line.portions;
        optionTags.push(food.dietTags);
        if (preferences) {
          const conflicts = findFoodConflicts(food.dietTags, preferences);
          if (conflicts.length > 0) {
            issues.push({
              severity: 'warning',
              code: 'preference_conflict',
              message: msg('food_conflict', { where, food: food.name, conflicts: conflicts.map(describeConflict) }),
              ...at,
            });
          }
        }
      });

      if (keepsKosher(preferences) && hasKosherConflict(optionTags)) {
        issues.push({
          severity: 'warning',
          code: 'kosher_conflict',
          message: msg('kosher_meat_dairy', { where }),
          mealIndex,
          optionIndex,
        });
      }
      const differs = PORTION_GROUP_IDS.filter((group) => totals[group] !== meal.portions[group]);
      if (differs.length > 0) {
        // Snack only when either side has some (most meals have none).
        const shown = PORTION_GROUP_IDS.filter((group) => group !== 'snack' || totals.snack > 0 || meal.portions.snack > 0);
        const describe = (counts: PortionCounts) =>
          shown.map((group) => msg('portion_count', { count: counts[group], group: msg(`group_${group}`) }));
        issues.push({
          severity: 'warning',
          code: 'option_portions_mismatch',
          message: msg('option_portions_mismatch', { where, option: describe(totals), meal: describe(meal.portions) }),
          mealIndex,
          optionIndex,
        });
      }
    });
  });

  const dayPortions = sumDayPortions(plan.meals);
  if (followsKeto(preferences) && hasKetoConflict(dayPortions, config.ketoMaxCarbPortions)) {
    issues.push({
      severity: 'warning',
      code: 'keto_conflict',
      message: msg('keto_carb_portions', { count: dayPortions.carb + dayPortions.snack, limit: config.ketoMaxCarbPortions }),
    });
  }

  return issues;
}

export function hasBlockingIssues(issues: readonly Pick<NutritionIssue, 'severity'>[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type Parse<T> = { value: T; error: null } | { value: null; error: ServerMessage };

export function parseCreateNutritionTemplatePayload(body: unknown): Parse<CreateNutritionTemplatePayload> {
  if (!isRecord(body)) return { value: null, error: msg('invalid_body') };
  const name = trimmedText(body.name, MAX_TEMPLATE_NAME_LENGTH);
  if (!name) return { value: null, error: msg('nutrition_template_name_required', { max: MAX_TEMPLATE_NAME_LENGTH }) };
  if (!isMissing(body.description) && (typeof body.description !== 'string' || body.description.length > MAX_TEMPLATE_DESCRIPTION_LENGTH)) {
    return { value: null, error: msg('nutrition_template_description_too_long', { max: MAX_TEMPLATE_DESCRIPTION_LENGTH }) };
  }
  const description = typeof body.description === 'string' ? body.description.trim() || undefined : undefined;
  return { value: { name, description }, error: null };
}

export function parseRenameNutritionTemplatePayload(body: unknown): Parse<RenameNutritionTemplatePayload> {
  if (!isRecord(body)) return { value: null, error: msg('invalid_body') };
  const name = trimmedText(body.name, MAX_TEMPLATE_NAME_LENGTH);
  if (!name) return { value: null, error: msg('nutrition_template_name_required', { max: MAX_TEMPLATE_NAME_LENGTH }) };
  return { value: { name }, error: null };
}

export function parseApplyNutritionTemplatePayload(body: unknown): Parse<ApplyNutritionTemplatePayload> {
  if (!isRecord(body) || !isObjectId(body.templateId)) return { value: null, error: msg('nutrition_template_required') };
  return { value: { templateId: body.templateId }, error: null };
}
