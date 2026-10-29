import type { FoodItem } from '@sistem/types';
import { compareFoods } from './nutritionMapping';

// THE food-bank merge (owner 2026-10-28), pure: what one coach's lists show.
//   system items − archived − the ones her edited copies replace − the ones she hid
//   + her own items (new ones and edited copies).
// An archived edited copy (reverted while a published version still used it) replaces nothing and is
// not listed: it only keeps resolving by id for that version.

export interface MergeFoodBankOptions {
  /** Her library's "hidden" filter: hidden system items stay, flagged `hidden`. */
  includeHidden?: boolean;
}

export function mergeFoodBank(
  system: readonly FoodItem[],
  own: readonly FoodItem[],
  hiddenIds: ReadonlySet<string>,
  { includeHidden = false }: MergeFoodBankOptions = {},
): FoodItem[] {
  const replaced = new Set(own.flatMap((item) => (item.basedOn && !item.archivedAt ? [item.basedOn] : [])));
  const fromSystem = system.flatMap((item) => {
    if (item.archivedAt || replaced.has(item.id)) return [];
    if (!hiddenIds.has(item.id)) return [item];
    return includeHidden ? [{ ...item, hidden: true }] : [];
  });
  const mine = own.filter((item) => !(item.basedOn && item.archivedAt));
  return sortFoods([...fromSystem, ...mine]);
}

/** Group, then the list's order, then name. */
export function sortFoods<T extends Pick<FoodItem, 'group' | 'order' | 'name'>>(foods: readonly T[]): T[] {
  return [...foods].sort((a, b) => a.group.localeCompare(b.group) || compareFoods(a, b));
}
