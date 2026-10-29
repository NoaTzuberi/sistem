import { Types } from 'mongoose';
import { FoodItem } from './foodItem.model';
import type { LeanFoodItem } from './nutritionMapping';

// migrate:food-bank (owner 2026-10-28), one time and idempotent: one coach's items (the seeded lists of
// coach@sistem.dev) become the app-wide food bank IN PLACE — same _id, so every plan, version, template and
// meal log that points at them keeps working. Other coaches' items stay theirs; an unchanged copy of a
// system item is only reported, never deleted.

export interface FoodBankMigrationReport {
  sourceItems: number;
  /** Converted (or, in a dry run, would be). */
  converted: number;
  /** Its itemKey is already a system item — left as it is. */
  skippedAlreadySystem: number;
  /** Other coaches' items that repeat a system item's key with no change (reported, not deleted). */
  unchangedDuplicates: { coachId: string; itemKey: string; foodId: string }[];
  applied: boolean;
}

/** The key a converted item gets: its seed key, else one made from its id (items the coach added by hand). */
export function itemKeyFor(item: Pick<LeanFoodItem, '_id' | 'seedKey'>): string {
  return item.seedKey ?? `migrated:${String(item._id)}`;
}

const SAME_FIELDS = ['group', 'name', 'portion', 'grams', 'kcal', 'isNewItem', 'category'] as const;

function sameFood(a: LeanFoodItem, b: LeanFoodItem): boolean {
  return (
    SAME_FIELDS.every((field) => (a[field] ?? null) === (b[field] ?? null)) &&
    [...(a.dietTags ?? [])].sort().join() === [...(b.dietTags ?? [])].sort().join()
  );
}

export async function migrateFoodBank({ sourceCoachId, apply }: { sourceCoachId: string; apply: boolean }): Promise<FoodBankMigrationReport> {
  const sourceId = new Types.ObjectId(sourceCoachId);
  const items = await FoodItem.find({ coachId: sourceId, scope: { $ne: 'system' } }).lean<LeanFoodItem[]>();
  const systemKeys = new Set(
    (await FoodItem.find({ scope: 'system', itemKey: { $type: 'string' } }).select('itemKey').lean()).map((item) => item.itemKey!),
  );

  let converted = 0;
  let skippedAlreadySystem = 0;
  for (const item of items) {
    const itemKey = itemKeyFor(item);
    if (systemKeys.has(itemKey)) {
      skippedAlreadySystem += 1;
      continue;
    }
    systemKeys.add(itemKey);
    converted += 1;
    if (!apply) continue;
    // Conditional on still being hers: a second run (or a parallel one) changes nothing.
    await FoodItem.updateOne(
      { _id: item._id, coachId: sourceId, scope: { $ne: 'system' } },
      { $set: { scope: 'system', itemKey, basedOn: null }, $unset: { coachId: 1, seedKey: 1 } },
    );
  }

  // Other coaches' items that repeat a system key unchanged: listed for a human decision.
  const system = await FoodItem.find({ scope: 'system' }).lean<LeanFoodItem[]>();
  // In a dry run the source items are not system yet: compare against what they would become.
  const bank = new Map<string, LeanFoodItem>([
    ...system.map((item) => [item.itemKey!, item] as const),
    ...(apply ? [] : items.map((item) => [itemKeyFor(item), item] as const)),
  ]);
  const others = await FoodItem.find({
    scope: { $ne: 'system' },
    coachId: { $nin: [null, sourceId] },
    seedKey: { $in: [...bank.keys()] },
  }).lean<LeanFoodItem[]>();
  const unchangedDuplicates = others
    .filter((item) => sameFood(item, bank.get(item.seedKey!)!))
    .map((item) => ({ coachId: String(item.coachId), itemKey: item.seedKey!, foodId: String(item._id) }));

  return { sourceItems: items.length, converted, skippedAlreadySystem, unchangedDuplicates, applied: apply };
}
