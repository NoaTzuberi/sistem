import type { Types } from 'mongoose';
import type {
  CalculationOverrides,
  CalorieSuggestion,
  CoachNutritionPlan,
  CoachNutritionPlanResponse,
  CreateNutritionTemplatePayload,
  FoodGroup,
  FoodItem,
  FormulaSex,
  NutritionConfig,
  NutritionGoal,
  NutritionIssue,
  NutritionMeal,
  NutritionPlanView,
  NutritionPreferences,
  NutritionTemplate,
  SaveNutritionPlanPayload,
  TraineeNutritionPlanResponse,
} from '@sistem/types';
import { emitAppEvent } from '../../events/appEvents';
import { getNutritionFeatures } from '../../config/features';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { toPublicNutritionPreferences } from '../onboarding/onboarding.service';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { addDays, localDateString } from '../plans/planWeek';
import { FOOD_GROUP_IDS } from './nutrition.constants';
import { BodyMetric } from '../bodyMetrics/bodyMetric.model';
import { Template } from '../templates/template.model';
import type { TemplateDocument } from '../templates/template.types';
import { NutritionPlan, NutritionPlanVersion } from './nutritionPlan.model';
import { Recipe } from './nutritionLogs.model';
import { EMPTY_OVERRIDES, recommendPortions, suggestCalorieTarget, goalFromOnboarding } from './calorieTarget';
import type { CalorieInputs } from './calorieTarget';
import { getEffectiveNutritionConfig } from './nutritionSettings.service';
import { isLinkableRecommendation } from '../aiRecommendations/aiRecommendation.service';
import { findCoachFoods, listCoachFoods, listSystemBank } from './foodItem.service';
import {
  collectContentIds,
  copyMeals,
  foodIdsOf,
  groupSwaps,
  toFoodFacts,
  toPublicMeals,
  toPublicTips,
  toStoredMeals,
  toStoredTips,
} from './nutritionMapping';
import { computeNutritionKcal, findNutritionPublishIssues, hasBlockingIssues, type NutritionProblem } from './nutrition.validation';
import type { NutritionPlanDocument, NutritionPlanVersionDocument, TipFields } from './nutrition.types';
import { dayPortionsOf, portionsKcalOf, resolveDailyPortions, resolvePlanMode, resolveVegetablesFree } from './nutritionPlanMode';
import { LocalizedError, msg } from '../../i18n';
import { findLiveCoaching, getCurrentCoaching } from '../coachings/coaching.service';
import { getCoachName } from '../coachProfiles/coachProfile.service';

// The coach's side of nutrition plans (PRD §5.6, dashboard builder). Every function
// takes the trainee id loadCoachTrainee already checked and the calling coach's id.
// One current plan per trainee: a working copy (autosaved, coach-only) plus a frozen
// version per publish — the trainee only ever reads the newest version.

export class NutritionPlanNotFoundError extends LocalizedError {}

/** The plan breaks a rule; `issues` say where. */
export class NutritionPlanValidationError extends Error {
  constructor(public readonly issues: NutritionProblem[]) {
    super(issues.find((issue) => issue.severity === 'error')?.message.code ?? 'nutrition_plan_invalid');
  }
}

/** The builder's response with its issues still as codes — the controller words them per request. */
export type CoachNutritionPlanResult = Omit<CoachNutritionPlanResponse, 'issues'> & { issues: NutritionProblem[] };

export class NutritionPlanConflictError extends LocalizedError {}

type LeanPlan = NutritionPlanDocument & { _id: Types.ObjectId };
type LeanVersion = NutritionPlanVersionDocument & { _id: Types.ObjectId };
type LeanTemplate = TemplateDocument & { _id: Types.ObjectId };

// ---------------------------------------------------------------------------
// Her data: preferences and the calorie inputs
// ---------------------------------------------------------------------------

/** Her onboarding nutrition preferences; null = not answered. */
export async function getNutritionPreferences(traineeId: string): Promise<NutritionPreferences | null> {
  const response = await OnboardingResponse.findOne({ userId: traineeId }).select('answers.nutritionPreferences').lean();
  const preferences = response?.answers?.nutritionPreferences;
  return preferences ? toPublicNutritionPreferences(preferences) : null;
}

/**
 * Latest weigh-in (else the onboarding weight), height, birth date, sex, training days,
 * goals, her weight goal (with the date her timeframe ends) and her today.
 */
export async function loadCalorieInputs(traineeId: string, now: Date): Promise<CalorieInputs> {
  const [response, weighIn, user] = await Promise.all([
    OnboardingResponse.findOne({ userId: traineeId }).select('answers').lean(),
    BodyMetric.findOne({ traineeId, weight: { $exists: true, $ne: null } }).sort({ date: -1 }).select('date weight').lean(),
    User.findById(traineeId).select('timezone').lean(),
  ]);
  const answers = response?.answers;
  const timezone = user?.timezone ?? DEFAULT_TIMEZONE;
  const goal = answers?.weightGoal;
  const timeframe = goal?.timeframe ?? null;
  const targetDate =
    !goal || !timeframe
      ? null
      : timeframe.kind === 'date'
        ? timeframe.date
        : addDays(localDateString(goal.setAt, timezone), timeframe.weeks * 7);
  const weight =
    weighIn?.weight !== undefined && weighIn?.weight !== null
      ? { kg: weighIn.weight, source: 'weigh_in' as const, date: weighIn.date }
      : answers?.weight !== undefined
        ? { kg: answers.weight, source: 'onboarding' as const, date: null }
        : null;
  return {
    weight,
    heightCm: answers?.height,
    birthDate: answers?.birthDate,
    gender: answers?.gender,
    trainingFrequency: answers?.trainingFrequency,
    goals: answers?.goals ?? [],
    weightGoal: goal ? { targetWeightKg: goal.targetWeightKg, targetDate } : null,
    today: localDateString(now, timezone),
  };
}

export async function getCalorieSuggestion(
  traineeId: string,
  coachId: string,
  options: { goal?: NutritionGoal | null; formulaSex?: FormulaSex | null; overrides?: Partial<CalculationOverrides> | null },
): Promise<CalorieSuggestion> {
  const now = new Date();
  const [inputs, config] = await Promise.all([loadCalorieInputs(traineeId, now), getEffectiveNutritionConfig(coachId)]);
  return suggestCalorieTarget(inputs, options, config, now);
}

export function storedOverrides(target: Pick<NutritionPlanDocument['calorieTarget'], 'overrides'>): CalculationOverrides {
  const stored = target.overrides ?? {};
  return Object.fromEntries(
    (Object.keys(EMPTY_OVERRIDES) as (keyof CalculationOverrides)[]).map((key) => [key, stored[key] ?? null]),
  ) as unknown as CalculationOverrides;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/** What a version / working copy holds that the trainee can see — compared to detect changes. */
function publishableContent(
  plan: Pick<NutritionPlanDocument, 'meals' | 'tips' | 'waterGoalMl' | 'proteinGramsTarget' | 'introMessage' | 'mode' | 'dailyPortions' | 'vegetablesFree'>,
): string {
  return JSON.stringify({
    mode: resolvePlanMode(plan),
    dailyPortions: resolveDailyPortions(plan),
    vegetablesFree: resolveVegetablesFree(plan),
    meals: toPublicMeals(plan.meals),
    tips: toPublicTips(plan.tips).map((tip) => tip.text),
    intro: plan.introMessage ?? null,
    waterGoalMl: plan.waterGoalMl ?? null,
    proteinGramsTarget: plan.proteinGramsTarget ?? null,
  });
}

// Coach side: her working copy / versions are found through the live coaching of THIS coach and this
// trainee (one working copy per coaching) — never by trainee only.
async function coachingFor(traineeId: string, coachId: string): Promise<string> {
  const coaching = await findLiveCoaching(traineeId, coachId);
  if (!coaching) throw new Error('No live coaching after the ownership check.');
  return String(coaching._id);
}

async function findLatestVersion(coachingId: string): Promise<LeanVersion | null> {
  return NutritionPlanVersion.findOne({ coachingId }).sort({ version: -1 }).lean<LeanVersion>();
}

/** Trainee side: the newest version from her current coaching (the single-coach app). */
async function findTraineeLatestVersion(traineeId: string): Promise<LeanVersion | null> {
  const coaching = await getCurrentCoaching(traineeId);
  return coaching ? findLatestVersion(String(coaching._id)) : null;
}

function toCoachPlan(plan: LeanPlan, config: NutritionConfig, latest: LeanVersion | null): CoachNutritionPlan {
  const meals = toPublicMeals(plan.meals);
  const target = plan.calorieTarget;
  const mode = resolvePlanMode(plan);
  const dayPortions = dayPortionsOf(plan);
  const mealsKcal = computeNutritionKcal(meals, config.groupKcal);
  return {
    id: String(plan._id),
    traineeId: String(plan.traineeId),
    calorieTarget: {
      kcal: target.kcal ?? null,
      source: target.source ?? null,
      goal: target.goal,
      formulaSex: target.formulaSex ?? null,
      overrides: storedOverrides(target),
      suggestion: target.suggestion ?? null,
      floorConfirmation: target.floorConfirmation
        ? {
            kcal: target.floorConfirmation.kcal,
            floorKcal: target.floorConfirmation.floorKcal,
            confirmedAt: target.floorConfirmation.confirmedAt.toISOString(),
          }
        : null,
    },
    mode,
    dailyPortions: resolveDailyPortions(plan),
    vegetablesFree: resolveVegetablesFree(plan),
    meals,
    tips: toPublicTips(plan.tips),
    introMessage: plan.introMessage ?? null,
    waterGoalMl: plan.waterGoalMl ?? null,
    proteinGramsTarget: plan.proteinGramsTarget ?? null,
    templateId: plan.templateId ? String(plan.templateId) : null,
    publishedVersion: plan.publishedVersion,
    publishedAt: plan.publishedAt ? plan.publishedAt.toISOString() : null,
    changedSincePublish:
      !latest ||
      publishableContent(plan) !== publishableContent(latest) ||
      (plan.calorieTarget.kcal ?? null) !== (latest.calorieTarget.kcal ?? null),
    updatedAt: plan.updatedAt.toISOString(),
    // Portions mode: the day is the daily portions (the meals keep their own kcal for menu mode).
    kcal: mode === 'portions' ? { meals: mealsKcal.meals, day: portionsKcalOf(dayPortions, config.groupKcal) } : mealsKcal,
    dayPortions,
    targetPortions: target.kcal ? recommendPortions(target.kcal, config).portions : null,
    aiRecommendationId: plan.aiRecommendationId ? String(plan.aiRecommendationId) : null,
  };
}

/**
 * A published version as she sees it — no calorie numbers anywhere. `foods` resolves the lines by id;
 * `swapFoods` = the coach's current lists (the food bank merge), her swap lists.
 */
export function buildPlanView(
  version: LeanVersion,
  foods: Map<string, FoodItem>,
  swapFoods: readonly FoodItem[],
  includeWater: boolean,
): NutritionPlanView {
  const mode = resolvePlanMode(version);
  // Portions mode: no meals for her — she picks from the food lists (the versions keep them for the photo slots).
  const meals = mode === 'menu' ? toPublicMeals(version.meals) : [];
  return {
    version: version.version,
    publishedAt: version.publishedAt.toISOString(),
    mode,
    meals: meals.map((meal) => ({
      id: meal.id,
      name: meal.name,
      portions: meal.portions,
      vegetablesFree: meal.vegetablesFree,
      options: meal.options.map((option) => ({
        id: option.id,
        label: option.label,
        lines: option.lines.map((line) => {
          const food = line.foodItemId ? foods.get(line.foodItemId) : undefined;
          return {
            id: line.id,
            kind: line.kind,
            group: food?.group ?? line.group,
            portions: line.portions,
            ...(line.text ? { text: line.text } : {}),
            ...(food ? { food: toFoodFacts(food) } : {}),
          };
        }),
      })),
    })),
    tips: version.tips.map((tip: TipFields) => tip.text),
    intro: version.introMessage ?? null,
    dayPortions: dayPortionsOf(version),
    vegetablesFree: resolveVegetablesFree(version),
    swaps: groupSwaps(swapFoods),
    ...(includeWater ? { waterGoalMl: version.waterGoalMl ?? null } : {}),
    proteinGramsTarget: version.proteinGramsTarget ?? null,
  };
}

async function findActiveRecipeIds(coachId: string, meals: readonly NutritionMeal[]): Promise<Set<string>> {
  const ids = meals.flatMap((meal) => meal.options.flatMap((option) => option.lines.flatMap((line) => (line.recipeId ? [line.recipeId] : []))));
  if (ids.length === 0) return new Set();
  const recipes = await Recipe.find({ _id: { $in: ids }, coachId, archivedAt: null }).select('_id').lean();
  return new Set(recipes.map((recipe) => String(recipe._id)));
}

async function findIssues(
  plan: LeanPlan,
  coachId: string,
  context: { foods: Map<string, FoodItem>; config: NutritionConfig; preferences: NutritionPreferences | null },
): Promise<NutritionProblem[]> {
  const meals = toPublicMeals(plan.meals);
  return findNutritionPublishIssues(
    {
      calorieTarget: { kcal: plan.calorieTarget.kcal ?? null, floorConfirmation: plan.calorieTarget.floorConfirmation ?? null },
      mode: resolvePlanMode(plan),
      dailyPortions: resolveDailyPortions(plan),
      meals,
    },
    { ...context, features: getNutritionFeatures(), recipeIds: await findActiveRecipeIds(coachId, meals) },
  );
}

const RECENT_FOODS_PER_GROUP = 8;
const RECENT_PLANS_SCANNED = 30;

/**
 * The coach's recently used items per group (the builder's "Recently used" row): her plans' working copies, most
 * recently saved first, each plan's lines in order; distinct, at most 8 per group. Archived ids may be in it — the
 * picker never shows archived items.
 */
export async function findRecentFoodIds(coachId: string): Promise<Record<FoodGroup, string[]>> {
  const plans = await NutritionPlan.find({ coachId })
    .sort({ updatedAt: -1 })
    .limit(RECENT_PLANS_SCANNED)
    .select('meals')
    .lean<Pick<LeanPlan, 'meals'>[]>();
  const recent = Object.fromEntries(FOOD_GROUP_IDS.map((group) => [group, [] as string[]])) as Record<FoodGroup, string[]>;
  for (const plan of plans) {
    for (const meal of plan.meals) {
      for (const option of meal.options) {
        for (const line of option.lines) {
          if (line.kind !== 'food' || !line.foodItemId || !line.group) continue;
          const list = recent[line.group];
          const id = String(line.foodItemId);
          if (list.length < RECENT_FOODS_PER_GROUP && !list.includes(id)) list.push(id);
        }
      }
    }
  }
  return recent;
}

export async function getCoachNutritionPlan(traineeId: string, coachId: string): Promise<CoachNutritionPlanResult> {
  const coachingId = await coachingFor(traineeId, coachId);
  const [plan, latest, foodList, config, preferences, goal, recentFoodIds] = await Promise.all([
    NutritionPlan.findOne({ coachingId }).lean<LeanPlan>(),
    findLatestVersion(coachingId),
    listCoachFoods(coachId),
    getEffectiveNutritionConfig(coachId),
    getNutritionPreferences(traineeId),
    defaultGoal(traineeId),
    findRecentFoodIds(coachId),
  ]);
  const features = getNutritionFeatures();
  // Her lists, plus anything her lines point at that the lists no longer show (archived, hidden, replaced).
  const listed = new Map(foodList.map((food) => [food.id, food]));
  const referenced = [plan ? toPublicMeals(plan.meals) : [], latest ? toPublicMeals(latest.meals) : []].flatMap(foodIdsOf);
  const missing = referenced.filter((id) => !listed.has(id));
  const foods = missing.length > 0 ? new Map([...(await findCoachFoods(coachId, missing)), ...listed]) : listed;
  return {
    plan: plan ? toCoachPlan(plan, config, latest) : null,
    published: latest ? buildPlanView(latest, foods, foodList, features.waterTracking) : null,
    preferences,
    defaultGoal: goal,
    foods: foodList,
    recentFoodIds,
    config,
    issues: plan ? await findIssues(plan, coachId, { foods, config, preferences }) : [],
    features,
  };
}

// ---------------------------------------------------------------------------
// Save (autosave of the working copy)
// ---------------------------------------------------------------------------

/** Food lines may only point at the coach's own items; returns each one's group. */
async function checkFoodLines(coachId: string, meals: SaveNutritionPlanPayload['meals']): Promise<Map<string, FoodGroup>> {
  const ids = [
    ...new Set(meals.flatMap((meal) => meal.options.flatMap((option) => option.lines.flatMap((line) => (line.foodItemId ? [line.foodItemId] : []))))),
  ];
  const foods = await findCoachFoods(coachId, ids);
  const issues: NutritionProblem[] = [];
  meals.forEach((meal, mealIndex) =>
    meal.options.forEach((option, optionIndex) =>
      option.lines.forEach((line, lineIndex) => {
        if (line.kind === 'food' && line.foodItemId && !foods.has(line.foodItemId)) {
          issues.push({ severity: 'error', code: 'food_missing', message: msg('food_not_in_list'), mealIndex, optionIndex, lineIndex });
        }
      }),
    ),
  );
  if (issues.length > 0) throw new NutritionPlanValidationError(issues);
  return new Map([...foods].map(([id, food]) => [id, food.group]));
}

/**
 * Replaces the working copy (created on the first save). Rows sent with the id they
 * already have keep it. The suggestion is re-computed and stored with its inputs; a
 * target below the floor keeps / gets a confirmation only for that exact kcal.
 */
export async function saveCoachNutritionPlan(
  traineeId: string,
  coachId: string,
  input: SaveNutritionPlanPayload,
): Promise<CoachNutritionPlanResult> {
  const coachingId = await coachingFor(traineeId, coachId);
  const foodGroups = await checkFoodLines(coachId, input.meals);
  if (input.aiRecommendationId && !(await isLinkableRecommendation(coachingId, input.aiRecommendationId, 'nutrition_plan'))) {
    throw new NutritionPlanValidationError([
      { severity: 'error', code: 'ai_recommendation_missing', message: msg('ai_recommendation_missing') },
    ]);
  }
  const now = new Date();
  const [existing, inputs, config] = await Promise.all([
    NutritionPlan.findOne({ coachingId }),
    loadCalorieInputs(traineeId, now),
    getEffectiveNutritionConfig(coachId),
  ]);
  const plan = existing ?? new NutritionPlan({ traineeId, coachId, coachingId, calorieTarget: { goal: input.calorieTarget.goal } });

  const { kcal, source, goal, formulaSex, confirmBelowFloor } = input.calorieTarget;
  // Omitted = the overrides she set before stay.
  const overrides = input.calorieTarget.overrides ?? storedOverrides(plan.calorieTarget ?? {});
  const suggestion = suggestCalorieTarget(inputs, { goal, formulaSex, overrides }, config, now);
  const previousConfirmation = plan.calorieTarget?.floorConfirmation ?? null;
  const floorConfirmation =
    kcal !== null && kcal < config.floorKcal && confirmBelowFloor
      ? previousConfirmation?.kcal === kcal
        ? previousConfirmation
        : { kcal, floorKcal: config.floorKcal, confirmedAt: new Date() }
      : null;

  plan.set('calorieTarget', { kcal, source, goal, formulaSex, overrides, suggestion, floorConfirmation });
  if (input.introMessage !== undefined) plan.set('introMessage', input.introMessage || null);
  const ids = collectContentIds(plan.meals ?? [], plan.tips ?? []);
  plan.set('meals', toStoredMeals(input.meals, foodGroups, ids));
  plan.set('tips', toStoredTips(input.tips, ids.tips));
  // Omitted = kept: switching modes never deletes the meals or the daily portions.
  if (input.mode !== undefined) plan.set('mode', input.mode);
  if (input.dailyPortions !== undefined) plan.set('dailyPortions', input.dailyPortions);
  if (input.vegetablesFree !== undefined) plan.set('vegetablesFree', input.vegetablesFree);
  if (input.waterGoalMl !== undefined) plan.set('waterGoalMl', input.waterGoalMl);
  if (input.proteinGramsTarget !== undefined) plan.set('proteinGramsTarget', input.proteinGramsTarget);
  if (input.aiRecommendationId !== undefined) plan.set('aiRecommendationId', input.aiRecommendationId);
  plan.markModified('calorieTarget.suggestion');
  await plan.save();

  return getCoachNutritionPlan(traineeId, coachId);
}

/** The goal a new plan starts with: mapped from her onboarding goals. */
async function defaultGoal(traineeId: string): Promise<NutritionGoal> {
  const response = await OnboardingResponse.findOne({ userId: traineeId }).select('answers.goals').lean();
  return goalFromOnboarding(response?.answers?.goals ?? []);
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

/**
 * Freezes the working copy as the next version and announces it
 * ('nutrition_plan.published' → her notification and the tab dot). Refused while a
 * publish rule fails, and when nothing changed since the last version.
 */
export async function publishCoachNutritionPlan(traineeId: string, coachId: string): Promise<CoachNutritionPlanResult> {
  const coachingId = await coachingFor(traineeId, coachId);
  const plan = await NutritionPlan.findOne({ coachingId }).lean<LeanPlan>();
  if (!plan) throw new NutritionPlanNotFoundError('nutrition_plan_none');

  const [config, foods, preferences, latest] = await Promise.all([
    getEffectiveNutritionConfig(coachId),
    findCoachFoods(coachId),
    getNutritionPreferences(traineeId),
    findLatestVersion(coachingId),
  ]);
  const issues = await findIssues(plan, coachId, { foods, config, preferences });
  if (hasBlockingIssues(issues)) throw new NutritionPlanValidationError(issues);
  if (latest && !toCoachPlan(plan, config, latest).changedSincePublish) {
    throw new NutritionPlanConflictError('nutrition_plan_unchanged');
  }

  const version = plan.publishedVersion + 1;
  const publishedAt = new Date();
  const meals = toPublicMeals(plan.meals);
  const mode = resolvePlanMode(plan);
  const dailyPortions = resolveDailyPortions(plan);
  const kcal = computeNutritionKcal(meals, config.groupKcal);
  const dayKcal = mode === 'portions' ? portionsKcalOf(dailyPortions, config.groupKcal) : kcal.day;
  try {
    // The unique (planId, version) index lets only one of two publishes at once through.
    await NutritionPlanVersion.create({
      planId: plan._id,
      traineeId: plan.traineeId,
      coachId: plan.coachId,
      coachingId: plan.coachingId,
      version,
      publishedAt,
      calorieTarget: plan.calorieTarget,
      mode,
      dailyPortions,
      vegetablesFree: resolveVegetablesFree(plan),
      meals: plan.meals,
      tips: plan.tips,
      introMessage: plan.introMessage ?? null,
      waterGoalMl: plan.waterGoalMl ?? null,
      proteinGramsTarget: plan.proteinGramsTarget ?? null,
      groupKcal: config.groupKcal,
      mealKcal: kcal.meals.map((meal) => ({ mealId: meal.mealId, kcal: meal.kcal })),
      dayKcal,
    });
  } catch (error) {
    if ((error as { code?: unknown }).code === 11000) {
      throw new NutritionPlanConflictError('nutrition_plan_just_published');
    }
    throw error;
  }
  await NutritionPlan.updateOne({ _id: plan._id }, { $set: { publishedVersion: version, publishedAt } });

  emitAppEvent('nutrition_plan.published', {
    planId: String(plan._id),
    traineeId,
    coachId: String(plan.coachId),
    version,
    publishedAt,
  });
  return getCoachNutritionPlan(traineeId, coachId);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function toPublicTemplate(template: LeanTemplate, config: NutritionConfig): NutritionTemplate {
  const meals = toPublicMeals(template.nutrition?.meals ?? []);
  return {
    id: String(template._id),
    name: template.name,
    ...(template.description ? { description: template.description } : {}),
    targetKcal: template.nutrition?.targetKcal ?? null,
    meals,
    tips: toPublicTips(template.nutrition?.tips ?? []),
    updatedAt: template.updatedAt.toISOString(),
    kcal: computeNutritionKcal(meals, config.groupKcal),
  };
}

export async function listNutritionTemplates(coachId: string): Promise<NutritionTemplate[]> {
  const [templates, config] = await Promise.all([
    Template.find({ coachId, type: 'nutrition_plan' }).sort({ updatedAt: -1 }).lean<LeanTemplate[]>(),
    getEffectiveNutritionConfig(coachId),
  ]);
  return templates.map((template) => toPublicTemplate(template, config));
}

/** A new name only — the meals, tips and target stay as saved. */
export async function renameNutritionTemplate(coachId: string, templateId: string, name: string): Promise<NutritionTemplate> {
  const template = await Template.findOneAndUpdate(
    { _id: templateId, coachId, type: 'nutrition_plan' },
    { $set: { name } },
    { new: true },
  ).lean<LeanTemplate>();
  if (!template) throw new NutritionPlanNotFoundError('nutrition_template_not_found');
  return toPublicTemplate(template, await getEffectiveNutritionConfig(coachId));
}

export async function deleteNutritionTemplate(coachId: string, templateId: string): Promise<void> {
  const result = await Template.deleteOne({ _id: templateId, coachId, type: 'nutrition_plan' });
  if (result.deletedCount === 0) throw new NutritionPlanNotFoundError('nutrition_template_not_found');
}

async function foodGroupsFor(coachId: string, meals: Parameters<typeof toPublicMeals>[0]): Promise<Map<string, FoodGroup>> {
  const foods = await findCoachFoods(coachId, foodIdsOf(toPublicMeals(meals)));
  return new Map([...foods].map(([id, food]) => [id, food.group]));
}

/** Her working copy → a new template (no trainee data, no floor confirmation). */
export async function createNutritionTemplateFromPlan(
  traineeId: string,
  coachId: string,
  input: CreateNutritionTemplatePayload,
): Promise<NutritionTemplate> {
  const plan = await NutritionPlan.findOne({ coachingId: await coachingFor(traineeId, coachId) }).lean<LeanPlan>();
  if (!plan || plan.meals.length === 0) {
    throw new NutritionPlanConflictError('nutrition_template_needs_meal');
  }
  const created = await Template.create({
    coachId,
    type: 'nutrition_plan',
    name: input.name,
    description: input.description,
    nutrition: {
      targetKcal: plan.calorieTarget.kcal ?? null,
      meals: copyMeals(plan.meals, await foodGroupsFor(coachId, plan.meals)),
      tips: toStoredTips(toPublicTips(plan.tips).map(({ text }) => ({ text }))),
    },
  });
  return toPublicTemplate(created.toObject() as LeanTemplate, await getEffectiveNutritionConfig(coachId));
}

/**
 * Starts her working copy from a template: meals and tips are copied (fresh ids). Its
 * target is used only when her plan has none yet — as the coach's override.
 */
export async function applyNutritionTemplate(traineeId: string, coachId: string, templateId: string): Promise<CoachNutritionPlanResult> {
  const template = await Template.findOne({ _id: templateId, coachId, type: 'nutrition_plan' }).lean<LeanTemplate>();
  if (!template?.nutrition) throw new NutritionPlanNotFoundError('nutrition_template_not_found');

  const coachingId = await coachingFor(traineeId, coachId);
  const plan = (await NutritionPlan.findOne({ coachingId })) ??
    new NutritionPlan({ traineeId, coachId, coachingId, calorieTarget: { goal: await defaultGoal(traineeId) } });
  if ((plan.calorieTarget.kcal ?? null) === null && template.nutrition.targetKcal) {
    plan.set('calorieTarget.kcal', template.nutrition.targetKcal);
    plan.set('calorieTarget.source', 'override');
  }
  plan.set('meals', copyMeals(template.nutrition.meals, await foodGroupsFor(coachId, template.nutrition.meals)));
  // A template is a menu: its meals are what she gets.
  plan.set('mode', 'menu');
  plan.set('tips', toStoredTips(toPublicTips(template.nutrition.tips).map(({ text }) => ({ text }))));
  plan.set('templateId', template._id);
  // The meals no longer come from an AI draft.
  plan.set('aiRecommendationId', null);
  await plan.save();
  return getCoachNutritionPlan(traineeId, coachId);
}

// ---------------------------------------------------------------------------
// Trainee
// ---------------------------------------------------------------------------

/**
 * Her newest published version (no calories), with every active swap of each group, whether she
 * has read this version's intro yet (it opens until she has), and the publishing coach's name.
 */
export async function getTraineeNutritionPlan(
  traineeId: string,
): Promise<TraineeNutritionPlanResult> {
  const latest = await findTraineeLatestVersion(traineeId);
  if (!latest) return { plan: null, introUnseen: false, coach: null, swaps: await traineeOwnSwaps(traineeId) };
  const coachId = String(latest.coachId);
  const [foods, swapFoods, user, coachName] = await Promise.all([
    findCoachFoods(coachId, foodIdsOf(toPublicMeals(latest.meals))),
    listCoachFoods(coachId),
    User.findById(traineeId).select('nutritionIntroSeenVersion').lean(),
    getCoachName(latest.coachId),
  ]);
  const plan = buildPlanView(latest, foods, swapFoods, getNutritionFeatures().waterTracking);
  return {
    plan,
    introUnseen: plan.intro !== null && (user?.nutritionIntroSeenVersion ?? 0) < latest.version,
    coach: coachName ? { name: coachName } : null,
    swaps: null,
  };
}

type TraineeNutritionPlanResult = Pick<TraineeNutritionPlanResponse, 'plan' | 'introUnseen' | 'coach' | 'swaps'>;

/** No published plan yet (her own daily target): her coach's lists, or the system bank without a coach. */
async function traineeOwnSwaps(traineeId: string): Promise<TraineeNutritionPlanResponse['swaps']> {
  const coaching = await getCurrentCoaching(traineeId);
  return groupSwaps(coaching ? await listCoachFoods(String(coaching.coachId)) : await listSystemBank());
}

/** She has read the intro of this version (never moves backwards). */
export async function markNutritionIntroSeen(traineeId: string, version: number): Promise<void> {
  await User.updateOne(
    { _id: traineeId, $or: [{ nutritionIntroSeenVersion: { $lt: version } }, { nutritionIntroSeenVersion: { $exists: false } }] },
    { $set: { nutritionIntroSeenVersion: version } },
  );
}

/** When her newest version was published (the Nutrition tab dot). */
export async function latestNutritionPublishTime(traineeId: string): Promise<Date | null> {
  const latest = await findTraineeLatestVersion(traineeId);
  return latest?.publishedAt ?? null;
}
