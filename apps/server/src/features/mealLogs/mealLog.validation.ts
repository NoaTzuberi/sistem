import mongoose from 'mongoose';
import type { SaveMealLogPayload } from '@sistem/types';
import { isDateString, isSunday } from '../plans/planWeek';
import { MAX_MEAL_PORTIONS, MAX_MEALS, PORTION_GROUP_IDS } from '../nutrition/nutrition.constants';
import { isPortionCount } from '../nutrition/nutrition.validation';
import { type ServerMessage, msg } from '../../i18n';

// A day's marks: portions per group in steps of 0.5. The plan's own limit ("never more
// than planned") is applied by the service, which knows that day's plan.
const MAX_DAY_PORTIONS = MAX_MEALS * MAX_MEAL_PORTIONS;

export function validateMealLogDateParam(value: unknown): ServerMessage | null {
  return isDateString(value) ? null : msg('body_date_invalid');
}

/** A plan meal's ObjectId, or a default meal id ('breakfast', 'afternoon_snack' …). */
export function validateMealIdParam(value: unknown): ServerMessage | null {
  return typeof value === 'string' && (mongoose.isValidObjectId(value) || /^[a-z_]{3,20}$/.test(value)) ? null : msg('meal_log_meal_id_invalid');
}

export function validateWeekStartQuery(value: unknown): ServerMessage | null {
  return value === undefined || isSunday(value as string) ? null : msg('meal_log_week_start_invalid');
}

export function parseSaveMealLogPayload(body: unknown): { value: SaveMealLogPayload; error: null } | { value: null; error: ServerMessage } {
  const eaten = (body as { eaten?: unknown } | null)?.eaten;
  if (typeof eaten !== 'object' || eaten === null) return { value: null, error: msg('meal_log_portions_required') };
  const record = eaten as Record<string, unknown>;
  if (!PORTION_GROUP_IDS.every((group) => isPortionCount(record[group] ?? 0, MAX_DAY_PORTIONS))) {
    return { value: null, error: msg('meal_log_portion_step') };
  }
  return {
    value: {
      eaten: {
        protein: (record.protein as number) ?? 0,
        carb: (record.carb as number) ?? 0,
        fat: (record.fat as number) ?? 0,
        snack: (record.snack as number) ?? 0,
      },
    },
    error: null,
  };
}
