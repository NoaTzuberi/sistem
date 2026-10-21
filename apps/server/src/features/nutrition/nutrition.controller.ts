import { Response } from 'express';
import type { CoachNutritionPlanResponse, FormulaSex, NutritionGoal, NutritionIssuesBody } from '@sistem/types';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getNutritionFeatures } from '../../config/features';
import {
  FoodItemNotFoundError,
  FoodItemValidationError,
  countFoodsAboveCaps,
  createCoachFood,
  deleteCoachFood,
  listCoachFoods,
  restoreCoachFood,
  updateCoachFood,
} from './foodItem.service';
import { NutritionSettingsConflictError, getNutritionSettings, previewNutritionSettings, saveNutritionSettings } from './nutritionSettings.service';
import {
  NutritionPlanConflictError,
  NutritionPlanNotFoundError,
  NutritionPlanValidationError,
  applyNutritionTemplate,
  createNutritionTemplateFromPlan,
  deleteNutritionTemplate,
  getCalorieSuggestion,
  getCoachNutritionPlan,
  getTraineeNutritionPlan,
  listNutritionTemplates,
  markNutritionIntroSeen,
  renameNutritionTemplate,
  publishCoachNutritionPlan,
  saveCoachNutritionPlan,
  type CoachNutritionPlanResult,
} from './nutritionPlan.service';
import {
  parseApplyNutritionTemplatePayload,
  localizeNutritionIssues,
  parseCalculationOverrides,
  type NutritionProblem,
  parseCreateNutritionTemplatePayload,
  parseFoodItemPayload,
  parseNutritionSettingsPayload,
  parseRenameNutritionTemplatePayload,
  parseSaveNutritionPlanPayload,
  validateIdParam,
} from './nutrition.validation';
import { FORMULA_SEX_IDS, NUTRITION_GOAL_IDS } from './nutrition.constants';
import { requestLanguage, sendError } from '../../i18n';

/** 400 with every issue worded in the request's language; the body's message is the first blocking one. */
function sendNutritionIssues(res: Response, problems: NutritionProblem[]): void {
  const issues = localizeNutritionIssues(problems, requestLanguage(res.req));
  const first = issues.find((issue) => issue.severity === 'error') ?? issues[0];
  const body: NutritionIssuesBody = { code: first.code, message: first.message, issues };
  res.status(400).json(body);
}

/** The builder's response, its issues worded in the request's language. */
function planBody(res: Response, result: CoachNutritionPlanResult): CoachNutritionPlanResponse {
  return { ...result, issues: localizeNutritionIssues(result.issues, requestLanguage(res.req)) };
}

/** Answers the request for a known nutrition error; anything else is rethrown (500). */
function sendNutritionError(res: Response, error: unknown): void {
  if (error instanceof FoodItemNotFoundError || error instanceof NutritionPlanNotFoundError) {
    sendError(res, 404, error.serverMessage);
    return;
  }
  if (error instanceof NutritionPlanValidationError) {
    sendNutritionIssues(res, error.issues);
    return;
  }
  if (error instanceof FoodItemValidationError) {
    sendError(res, 400, error.serverMessage);
    return;
  }
  if (error instanceof NutritionPlanConflictError || error instanceof NutritionSettingsConflictError) {
    sendError(res, 409, error.serverMessage);
    return;
  }
  throw error;
}

/** A route param id, or null after answering 400. */
function readId(req: AuthenticatedRequest, res: Response, param: string, label: string): string | null {
  const error = validateIdParam(req.params[param], label);
  if (error) {
    sendError(res, 400, error);
    return null;
  }
  return String(req.params[param]);
}

// --- Food list (coach) -------------------------------------------------------

export async function getFoods(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ items: await listCoachFoods(req.userId!) });
}

export async function postFood(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseFoodItemPayload(req.body, false);
  if (!value) {
    sendError(res, 400, error);
    return;
  }
  try {
    res.status(201).json({ item: await createCoachFood(req.userId!, value) });
  } catch (createError) {
    sendNutritionError(res, createError);
  }
}

export async function patchFood(req: AuthenticatedRequest, res: Response) {
  const foodId = readId(req, res, 'foodId', 'food item');
  if (!foodId) return;
  const { value, error } = parseFoodItemPayload(req.body, true);
  if (!value) {
    sendError(res, 400, error);
    return;
  }
  try {
    res.status(200).json({ item: await updateCoachFood(req.userId!, foodId, value) });
  } catch (updateError) {
    sendNutritionError(res, updateError);
  }
}

export async function deleteFood(req: AuthenticatedRequest, res: Response) {
  const foodId = readId(req, res, 'foodId', 'food item');
  if (!foodId) return;
  try {
    res.status(200).json(await deleteCoachFood(req.userId!, foodId));
  } catch (error) {
    sendNutritionError(res, error);
  }
}

export async function postRestoreFood(req: AuthenticatedRequest, res: Response) {
  const foodId = readId(req, res, 'foodId', 'food item');
  if (!foodId) return;
  try {
    res.status(200).json({ item: await restoreCoachFood(req.userId!, foodId) });
  } catch (error) {
    sendNutritionError(res, error);
  }
}

// --- Settings (coach) ---------------------------------------------------------

export async function getSettings(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(await getNutritionSettings(req.userId!));
}

export async function putSettings(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseNutritionSettingsPayload(req.body);
  if (!value) {
    sendError(res, 400, error);
    return;
  }
  try {
    res.status(200).json(await saveNutritionSettings(req.userId!, value, (caps) => countFoodsAboveCaps(req.userId!, caps)));
  } catch (saveError) {
    sendNutritionError(res, saveError);
  }
}

/** The settings screen's live preview: her unsaved numbers on the example trainee (nothing stored). */
export function postSettingsPreview(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseNutritionSettingsPayload(req.body);
  if (!value) {
    sendError(res, 400, error);
    return;
  }
  res.status(200).json(previewNutritionSettings(value, new Date()));
}

// --- Templates (coach) --------------------------------------------------------

export async function getTemplates(req: AuthenticatedRequest, res: Response) {
  res.status(200).json({ items: await listNutritionTemplates(req.userId!) });
}

export async function patchTemplate(req: AuthenticatedRequest, res: Response) {
  const templateId = readId(req, res, 'templateId', 'template');
  if (!templateId) return;
  const { value, error } = parseRenameNutritionTemplatePayload(req.body);
  if (!value) {
    sendError(res, 400, error);
    return;
  }
  try {
    res.status(200).json({ template: await renameNutritionTemplate(req.userId!, templateId, value.name) });
  } catch (renameError) {
    sendNutritionError(res, renameError);
  }
}

export async function deleteTemplate(req: AuthenticatedRequest, res: Response) {
  const templateId = readId(req, res, 'templateId', 'template');
  if (!templateId) return;
  try {
    await deleteNutritionTemplate(req.userId!, templateId);
    res.status(204).end();
  } catch (error) {
    sendNutritionError(res, error);
  }
}

// --- A trainee's plan (coach; after loadCoachTrainee) -----------------------------

export async function getTraineeNutrition(req: AuthenticatedRequest, res: Response) {
  res.status(200).json(planBody(res, await getCoachNutritionPlan(req.traineeId!, req.userId!)));
}

const OVERRIDE_QUERY_KEYS = ['weightKg', 'heightCm', 'ageYears', 'activityFactor', 'targetWeightKg', 'timelineWeeks'] as const;

export async function getTraineeCalorieSuggestion(req: AuthenticatedRequest, res: Response) {
  const { goal, formula } = req.query;
  if (goal !== undefined && !(NUTRITION_GOAL_IDS as readonly unknown[]).includes(goal)) {
    sendError(res, 400, 'nutrition_goal_unknown');
    return;
  }
  if (formula !== undefined && !(FORMULA_SEX_IDS as readonly unknown[]).includes(formula)) {
    sendError(res, 400, 'nutrition_formula_invalid');
    return;
  }
  // The calculation summary's live values: ?weightKg=…&timelineWeeks=… (absent = her data).
  const rawOverrides = Object.fromEntries(
    OVERRIDE_QUERY_KEYS.flatMap((key) => (typeof req.query[key] === 'string' && req.query[key] !== '' ? [[key, Number(req.query[key])]] : [])),
  );
  const overrides = parseCalculationOverrides(rawOverrides);
  if (!overrides.value) {
    sendError(res, 400, overrides.error);
    return;
  }
  res.status(200).json(
    await getCalorieSuggestion(req.traineeId!, req.userId!, {
      goal: (goal as NutritionGoal | undefined) ?? null,
      formulaSex: (formula as FormulaSex | undefined) ?? null,
      overrides: overrides.value,
    }),
  );
}

export async function putTraineeNutrition(req: AuthenticatedRequest, res: Response) {
  const { value, issues } = parseSaveNutritionPlanPayload(req.body, getNutritionFeatures());
  if (!value) {
    sendNutritionIssues(res, issues);
    return;
  }
  try {
    res.status(200).json(planBody(res, await saveCoachNutritionPlan(req.traineeId!, req.userId!, value)));
  } catch (error) {
    sendNutritionError(res, error);
  }
}

export async function postPublishTraineeNutrition(req: AuthenticatedRequest, res: Response) {
  try {
    res.status(200).json(planBody(res, await publishCoachNutritionPlan(req.traineeId!, req.userId!)));
  } catch (error) {
    sendNutritionError(res, error);
  }
}

export async function postTraineeNutritionFromTemplate(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseApplyNutritionTemplatePayload(req.body);
  if (!value) {
    sendError(res, 400, error);
    return;
  }
  try {
    res.status(200).json(planBody(res, await applyNutritionTemplate(req.traineeId!, req.userId!, value.templateId)));
  } catch (applyError) {
    sendNutritionError(res, applyError);
  }
}

export async function postTraineeNutritionTemplate(req: AuthenticatedRequest, res: Response) {
  const { value, error } = parseCreateNutritionTemplatePayload(req.body);
  if (!value) {
    sendError(res, 400, error);
    return;
  }
  try {
    res.status(201).json({ template: await createNutritionTemplateFromPlan(req.traineeId!, req.userId!, value) });
  } catch (createError) {
    sendNutritionError(res, createError);
  }
}

// --- Trainee ----------------------------------------------------------------------

/** Her newest published version — no calorie numbers. */
export async function getMyNutritionPlan(req: AuthenticatedRequest, res: Response) {
  const { plan, introUnseen, coach } = await getTraineeNutritionPlan(req.userId!);
  res.status(200).json({ plan, introUnseen, coach, features: getNutritionFeatures() });
}

/** She has read the coach's intro of this version — it starts collapsed from now on. */
export async function postMyNutritionIntroSeen(req: AuthenticatedRequest, res: Response) {
  const version = (req.body as { version?: unknown } | undefined)?.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    sendError(res, 400, 'nutrition_version_invalid');
    return;
  }
  await markNutritionIntroSeen(req.userId!, version);
  res.status(204).end();
}
