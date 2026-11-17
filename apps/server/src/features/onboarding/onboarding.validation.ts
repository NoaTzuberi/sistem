import type { OnboardingStepId, WeightUnit } from '@sistem/types';
import { KG_PER_LB, lbToKg } from '../users/units';
import { parsePhoneValue } from '../users/phone';
import {
  GOAL_IDS,
  ACTIVITY_IDS,
  EQUIPMENT_IDS,
  MUSCLE_FOCUS_IDS,
  RECOVERY_FLAG_IDS,
  GENDER_IDS,
  TRAINING_EXPERIENCE_IDS,
} from '../users/users.constants';
import {
  ALLERGY_IDS,
  DIET_STYLE_IDS,
  DIET_TYPE_IDS,
  INTOLERANCE_IDS,
  MAX_PREFERENCE_DETAILS_LENGTH,
  MAX_PREFERENCE_TEXT_LENGTH,
  MEALS_PER_DAY_RANGE,
  RELIGIOUS_IDS,
  WEIGHT_GOAL_MAX_DAYS_AHEAD,
  WEIGHT_GOAL_WEEKS_RANGE,
} from '../nutrition/nutrition.constants';
import { daysBetween, isDateString } from '../plans/planWeek';
import {
  ONBOARDING_FIELDS,
  ONBOARDING_STEP_FIELDS,
  ONBOARDING_STEP_IDS,
  REQUIRED_ON_COMPLETE,
} from './onboarding.constants';
import type { OnboardingField } from './onboarding.constants';
import { type ServerMessage, msg } from '../../i18n';

// Moved from users.validation.ts (Phase 3) and split per field, so a single step and
// the final submit share the same rules and messages.

const MIN_AGE = 5;
const MAX_AGE = 120;
const MIN_HEIGHT_CM = 50;
const MAX_HEIGHT_CM = 300;
// The weight is typed in her unit; the limits apply to the kg value it is stored as
// (Phase 10), so in lb they are about 44–882. Height is always typed in cm.
const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;

interface ValidationContext {
  /** The unit the weight was typed in. */
  weightUnit: WeightUnit;
}

type FieldValidator = (value: unknown, context: ValidationContext) => ServerMessage | null;

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function weightRangeMessage(unit: WeightUnit, target = false): ServerMessage {
  if (unit === 'kg') return msg(target ? 'onboarding_target_weight_invalid' : 'onboarding_weight_invalid', { min: MIN_WEIGHT_KG, max: MAX_WEIGHT_KG });
  return msg(target ? 'onboarding_target_weight_invalid_lb' : 'onboarding_weight_invalid_lb', {
    min: roundOneDecimal(MIN_WEIGHT_KG / KG_PER_LB),
    max: roundOneDecimal(MAX_WEIGHT_KG / KG_PER_LB),
  });
}

function isWeightUnit(value: unknown): value is WeightUnit {
  return value === 'kg' || value === 'lb';
}

/** The unit sent with the answers (same step), else the one she chose before. */
function resolveWeightUnit(answers: Record<string, unknown>, storedUnit: WeightUnit): WeightUnit {
  const units = answers.units;
  return isObject(units) && isWeightUnit(units.weight) ? units.weight : storedUnit;
}

function isStringArrayWithinSet(value: unknown, allowed: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && allowed.includes(item))
  );
}

function isNumberInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isValidBirthDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const ageMs = Date.now() - date.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears >= MIN_AGE && ageYears <= MAX_AGE;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const FIELD_VALIDATORS: Record<OnboardingField, FieldValidator> = {
  phone(value) {
    return parsePhoneValue(value) ? null : msg('phone_invalid');
  },

  name(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return msg('onboarding_name_invalid');
    }
    return null;
  },

  birthDate(value) {
    return isValidBirthDate(value) ? null : msg('onboarding_birth_date_invalid', { min: MIN_AGE, max: MAX_AGE });
  },

  height(value) {
    return isNumberInRange(value, MIN_HEIGHT_CM, MAX_HEIGHT_CM)
      ? null
      : msg('onboarding_height_invalid', { min: MIN_HEIGHT_CM, max: MAX_HEIGHT_CM });
  },

  weight(value, { weightUnit }) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return weightRangeMessage(weightUnit);
    // Converted the same way the service stores it, so the limits match what is saved.
    const kg = weightUnit === 'lb' ? lbToKg(value) : value;
    return kg >= MIN_WEIGHT_KG && kg <= MAX_WEIGHT_KG ? null : weightRangeMessage(weightUnit);
  },

  gender(value) {
    if (value !== '' && !(GENDER_IDS as readonly string[]).includes(value as string)) {
      return msg('onboarding_gender_invalid');
    }
    return null;
  },

  units(value) {
    if (!isObject(value)) return msg('onboarding_units_required');
    if (value.weight !== 'kg' && value.weight !== 'lb') return msg('weight_unit_invalid');
    if (value.distance !== 'km' && value.distance !== 'miles') return msg('distance_unit_invalid');
    return null;
  },

  goals(value) {
    if (!isStringArrayWithinSet(value, GOAL_IDS) || (value as unknown[]).length === 0) {
      return msg('onboarding_goals_invalid');
    }
    return null;
  },

  trainingFrequency(value) {
    if (!isObject(value)) return msg('onboarding_frequency_required');
    if (!isNumberInRange(value.minDays, 1, 7)) return msg('onboarding_min_days_invalid');
    if (!isNumberInRange(value.maxDays, 1, 7)) return msg('onboarding_max_days_invalid');
    if ((value.minDays as number) > (value.maxDays as number)) {
      return msg('onboarding_days_inverted');
    }
    if (typeof value.flexibleSchedule !== 'boolean') return msg('onboarding_flexible_invalid');
    return null;
  },

  trainingExperience(value) {
    if (value === null) return null;
    return (TRAINING_EXPERIENCE_IDS as readonly string[]).includes(value as string) ? null : msg('onboarding_experience_invalid');
  },

  preferredActivities(value) {
    if (!isStringArrayWithinSet(value, ACTIVITY_IDS) || (value as unknown[]).length === 0) {
      return msg('onboarding_activities_invalid');
    }
    return null;
  },

  exercisePreferences(value) {
    if (!isObject(value)) return msg('onboarding_exercise_preferences_invalid');
    if (value.favoriteExerciseNotes !== undefined && typeof value.favoriteExerciseNotes !== 'string') {
      return msg('onboarding_favorite_notes_invalid');
    }
    if (value.improvementExerciseNotes !== undefined && typeof value.improvementExerciseNotes !== 'string') {
      return msg('onboarding_improvement_notes_invalid');
    }
    if (value.muscleFocus !== undefined && !isStringArrayWithinSet(value.muscleFocus, MUSCLE_FOCUS_IDS)) {
      return msg('onboarding_muscle_focus_invalid');
    }
    return null;
  },

  equipment(value) {
    if (!isStringArrayWithinSet(value, EQUIPMENT_IDS) || (value as unknown[]).length === 0) {
      return msg('onboarding_equipment_invalid');
    }
    return null;
  },

  recovery(value) {
    if (!isObject(value)) return msg('onboarding_recovery_invalid');
    if (value.flags !== undefined && !isStringArrayWithinSet(value.flags, RECOVERY_FLAG_IDS)) {
      return msg('onboarding_recovery_flags_invalid');
    }
    if (value.notes !== undefined && typeof value.notes !== 'string') {
      return msg('onboarding_recovery_notes_invalid');
    }
    return null;
  },

  nutritionPreferences(value) {
    if (!isObject(value)) return msg('onboarding_nutrition_invalid');
    if (!(DIET_TYPE_IDS as readonly unknown[]).includes(value.dietType)) {
      return msg('onboarding_diet_type_invalid');
    }
    if (!isOptionalText(value.dietTypeDetails, MAX_PREFERENCE_DETAILS_LENGTH)) {
      return msg('onboarding_details_too_long', { max: MAX_PREFERENCE_DETAILS_LENGTH });
    }
    const lists = [
      ['dietStyles', DIET_STYLE_IDS, msg('onboarding_label_diet_styles')],
      ['religious', RELIGIOUS_IDS, msg('onboarding_label_religious')],
      ['intolerances', INTOLERANCE_IDS, msg('onboarding_label_intolerances')],
      ['allergies', ALLERGY_IDS, msg('onboarding_label_allergies')],
    ] as const;
    for (const [field, ids, label] of lists) {
      const error = preferenceItemsError(value[field], ids, label);
      if (error) return error;
    }
    for (const [field, label] of [
      ['foodsLoved', msg('onboarding_label_foods_loved')],
      ['foodsDisliked', msg('onboarding_label_foods_disliked')],
    ] as const) {
      if (!isOptionalText(value[field], MAX_PREFERENCE_TEXT_LENGTH)) {
        return msg('onboarding_text_too_long', { label, max: MAX_PREFERENCE_TEXT_LENGTH });
      }
    }
    const meals = value.mealsPerDay;
    if (
      meals !== undefined &&
      meals !== null &&
      !(Number.isInteger(meals) && isNumberInRange(meals, MEALS_PER_DAY_RANGE.min, MEALS_PER_DAY_RANGE.max))
    ) {
      return msg('onboarding_meals_invalid', { min: MEALS_PER_DAY_RANGE.min, max: MEALS_PER_DAY_RANGE.max });
    }
    return null;
  },

  weightGoal(value, { weightUnit }) {
    // null clears her goal.
    if (value === null) return null;
    if (!isObject(value)) return msg('onboarding_weight_goal_invalid');
    // The same limits as her weight, in the unit she typed.
    const targetError = FIELD_VALIDATORS.weight(value.targetWeight, { weightUnit });
    if (targetError) return weightRangeMessage(weightUnit, true);
    const timeframe = value.timeframe;
    if (timeframe === null || timeframe === undefined) return null;
    if (!isObject(timeframe)) return msg('onboarding_timeframe_invalid');
    if (timeframe.kind === 'weeks') {
      const { min, max } = WEIGHT_GOAL_WEEKS_RANGE;
      return Number.isInteger(timeframe.weeks) && isNumberInRange(timeframe.weeks, min, max)
        ? null
        : msg('onboarding_timeframe_weeks_invalid', { min, max });
    }
    if (timeframe.kind === 'date') {
      if (!isDateString(timeframe.date)) return msg('onboarding_target_date_invalid');
      // Her zone isn't known here: a day of slack around "today" (UTC).
      const today = new Date().toISOString().slice(0, 10);
      const ahead = daysBetween(today, timeframe.date);
      return ahead >= 0 && ahead <= WEIGHT_GOAL_MAX_DAYS_AHEAD ? null : msg('onboarding_target_date_range');
    }
    return msg('onboarding_timeframe_invalid');
  },
};

function isOptionalText(value: unknown, maxLength: number): boolean {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

/** [{ id, details? }] with known ids (a repeat is dropped on save); "other" needs its text. */
function preferenceItemsError(value: unknown, ids: readonly string[], label: ServerMessage): ServerMessage | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return msg('onboarding_list_not_list', { label });
  for (const item of value) {
    if (!isObject(item) || typeof item.id !== 'string' || !ids.includes(item.id)) {
      return msg('onboarding_list_invalid_value', { label });
    }
    if (!isOptionalText(item.details, MAX_PREFERENCE_DETAILS_LENGTH)) {
      return msg('onboarding_details_too_long', { max: MAX_PREFERENCE_DETAILS_LENGTH });
    }
    if (item.id === 'other' && !(typeof item.details === 'string' && item.details.trim().length > 0)) {
      return msg('onboarding_list_other_needs_text', { label });
    }
  }
  return null;
}

/**
 * POST /onboarding/complete — every required answer, same rules as the ATLAS submit.
 * `storedWeightUnit`: her saved unit, used when the body carries no units.
 */
export function validateCompleteOnboardingPayload(body: unknown, storedWeightUnit: WeightUnit = 'kg'): ServerMessage | null {
  if (!isObject(body)) {
    return msg('invalid_body');
  }

  const context = { weightUnit: resolveWeightUnit(body, storedWeightUnit) };
  for (const field of ONBOARDING_FIELDS) {
    const value = body[field];
    if (value === undefined && !REQUIRED_ON_COMPLETE.includes(field)) continue;
    const error = FIELD_VALIDATORS[field](value, context);
    if (error) return error;
  }
  return null;
}

function isStepId(value: unknown): value is OnboardingStepId {
  return typeof value === 'string' && (ONBOARDING_STEP_IDS as readonly string[]).includes(value);
}

/** PATCH /onboarding — `{ step, answers }` with only that step's fields. */
export function validateOnboardingStepPayload(body: unknown, storedWeightUnit: WeightUnit = 'kg'): ServerMessage | null {
  if (!isObject(body)) {
    return msg('invalid_body');
  }
  if (!isStepId(body.step)) {
    return msg('onboarding_step_invalid');
  }
  const answers = body.answers ?? {};
  if (!isObject(answers)) {
    return msg('onboarding_answers_invalid');
  }

  const allowed = ONBOARDING_STEP_FIELDS[body.step];
  const context = { weightUnit: resolveWeightUnit(answers, storedWeightUnit) };
  for (const [field, value] of Object.entries(answers)) {
    if (!(allowed as readonly string[]).includes(field)) {
      return msg('onboarding_field_not_in_step', { field, step: body.step });
    }
    if (value === undefined) continue;
    const error = FIELD_VALIDATORS[field as OnboardingField](value, context);
    if (error) return error;
  }
  return null;
}
