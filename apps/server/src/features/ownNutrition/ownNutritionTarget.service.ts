import type { OwnNutritionTarget as PublicOwnTarget, SaveOwnNutritionTargetPayload } from '@sistem/types';
import { OwnNutritionTarget } from './ownNutritionTarget.model';
import type { OwnNutritionTargetDocument } from './ownNutritionTarget.model';

export type LeanOwnTarget = Pick<OwnNutritionTargetDocument, 'portions' | 'freeVegetables' | 'updatedAt'>;

export async function loadOwnTarget(traineeId: string): Promise<LeanOwnTarget | null> {
  return OwnNutritionTarget.findOne({ traineeId }).select('portions freeVegetables updatedAt').lean<LeanOwnTarget>();
}

export function toPublicOwnTarget(target: LeanOwnTarget | null): PublicOwnTarget | null {
  if (!target) return null;
  const { protein, carb, fat, snack } = target.portions;
  return { portions: { protein, carb, fat, snack: snack ?? 0 }, freeVegetables: target.freeVegetables, updatedAt: target.updatedAt.toISOString() };
}

/** Upsert: one target per trainee. Today's tracking follows it at once; past days keep their snapshot. */
export async function saveOwnTarget(traineeId: string, input: SaveOwnNutritionTargetPayload): Promise<PublicOwnTarget> {
  const saved = await OwnNutritionTarget.findOneAndUpdate(
    { traineeId },
    { $set: { portions: input.portions, freeVegetables: input.freeVegetables } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<LeanOwnTarget>();
  return toPublicOwnTarget(saved)!;
}
