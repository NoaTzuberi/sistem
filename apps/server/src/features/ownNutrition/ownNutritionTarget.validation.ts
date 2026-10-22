import type { SaveOwnNutritionTargetPayload } from '@sistem/types';
import type { MessageCode } from '../../i18n';
import { PORTION_GROUP_IDS, PORTION_STEP } from '../nutrition/nutrition.constants';

/** Per group, per day — generous: the steppers stop here. */
export const MAX_OWN_PORTIONS = 20;

type Parsed = { value: SaveOwnNutritionTargetPayload; error?: undefined } | { value?: undefined; error: MessageCode };

/** PUT /meal-logs/target { portions: { protein, carb, fat, snack }, freeVegetables } — steps of 0.5, ≥ 1 portion in all. */
export function parseOwnTargetPayload(body: unknown): Parsed {
  const raw = (body ?? {}) as { portions?: Record<string, unknown>; freeVegetables?: unknown };
  if (!raw.portions || typeof raw.portions !== 'object') return { error: 'invalid_body' };
  const portions = { protein: 0, carb: 0, fat: 0, snack: 0 };
  for (const group of PORTION_GROUP_IDS) {
    const value = raw.portions[group] ?? 0;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_OWN_PORTIONS || Math.round(value / PORTION_STEP) * PORTION_STEP !== value) {
      return { error: 'own_target_portions_invalid' };
    }
    portions[group] = value;
  }
  if (PORTION_GROUP_IDS.every((group) => portions[group] === 0)) return { error: 'own_target_empty' };
  if (raw.freeVegetables !== undefined && typeof raw.freeVegetables !== 'boolean') return { error: 'invalid_body' };
  return { value: { portions, freeVegetables: raw.freeVegetables ?? true } };
}
