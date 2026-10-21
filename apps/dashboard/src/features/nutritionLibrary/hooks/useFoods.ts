import { useCallback, useMemo, useState } from 'react';
import type { FoodGroup, FoodItem, FoodItemPayload, NutritionConfig } from '@sistem/types';
import { errorText } from '../data/errorText';
import { FOOD_GROUPS, fill, getActiveLanguage, sharedCopy, useCopy, useLoad } from '@sistem/shared';
import { createFood, deleteFood, getNutritionSettings, listFoods, restoreFood, updateFood } from '../../../services/coach/coachService';
import type { CategoryFilter } from '../../nutrition/data/foodFilters';
import { filterFoods } from '../data/foodLibrary';
import { useHiddenItems } from '../../../hooks/useHiddenItems';
import { nutritionLibraryCopy } from '../copy';

async function loadFoods(): Promise<{ foods: FoodItem[]; config: NutritionConfig }> {
  const [foods, settings] = await Promise.all([listFoods(), getNutritionSettings()]);
  return { foods, config: settings.config };
}

export interface FoodSection {
  group: FoodGroup;
  /** kcal per portion; 0 = free (vegetables). */
  cap: number;
  items: FoodItem[];
}

/** An action's outcome: the line for the toast, and whether it went through. */
export interface FoodActionResult {
  ok: boolean;
  message: string;
}

/**
 * The coach's food list (PRD §5.6) with its filters: a group (or all), a category of that group,
 * a search over name and category, and the archive. Every change goes to the server, then the
 * list is read again — the server decides delete vs archive and checks the group caps.
 */
export function useFoods() {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionLibraryCopy);
  const { data, error, isLoading, reload } = useLoad(loadFoods, copy.foodsLoadError);
  const [group, setGroupState] = useState<FoodGroup | null>(null);
  const [category, setCategory] = useState<CategoryFilter>(null);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const setGroup = useCallback((next: FoodGroup | null) => {
    setGroupState(next);
    // A category belongs to one group.
    setCategory(null);
  }, []);

  // A delete waiting for its "Undo" hides the item at once (useUndoToast).
  const hiddenItems = useHiddenItems(data);
  const { hidden } = hiddenItems;
  const foods = useMemo(() => (data?.foods ?? []).filter((food) => !hidden.has(food.id)), [data, hidden]);
  const caps = data?.config.groupKcal;

  // The chips count what the archive switch shows; the search narrows only the cards.
  const counts = useMemo(() => {
    const shown = foods.filter((food) => showArchived || !food.archivedAt);
    return {
      all: shown.length,
      byGroup: Object.fromEntries(FOOD_GROUPS.map((id) => [id, shown.filter((food) => food.group === id).length])) as Record<FoodGroup, number>,
    };
  }, [foods, showArchived]);

  const activeCount = useMemo(() => foods.filter((food) => !food.archivedAt).length, [foods]);

  const sections = useMemo<FoodSection[]>(() => {
    if (!caps) return [];
    const searchText = (item: FoodItem) => `${item.name} ${item.category ? shared.nutrition.categories[item.category] : ''}`;
    const visible = filterFoods(foods, { group, category, query, showArchived }, searchText);
    return FOOD_GROUPS.filter((id) => group === null || id === group)
      .map((id) => ({ group: id, cap: caps[id], items: visible.filter((food) => food.group === id) }))
      .filter((section) => section.items.length > 0 || (group !== null && query.trim() === ''));
  }, [foods, caps, group, category, query, showArchived, shared]);

  /** The items of the chosen group the archive switch shows — what the category chips offer. */
  const groupItems = useMemo(
    () => (group === null ? [] : foods.filter((food) => food.group === group && (showArchived || !food.archivedAt))),
    [foods, group, showArchived],
  );

  const run = useCallback(
    async (action: () => Promise<string>, fallback: string): Promise<FoodActionResult> => {
      try {
        const message = await action();
        reload();
        return { ok: true, message };
      } catch (failure) {
        return { ok: false, message: errorText(failure, fallback) };
      }
    },
    [reload],
  );

  const save = useCallback(
    (item: FoodItem | null, payload: FoodItemPayload) =>
      run(async () => {
        const text = nutritionLibraryCopy[getActiveLanguage()];
        const saved = item ? await updateFood(item.id, payload) : await createFood(payload);
        return fill(item ? text.saved : text.added, { name: saved.name });
      }, copy.foodSaveError),
    [run, copy.foodSaveError],
  );

  const { markDone, show } = hiddenItems;
  /** The server call behind "remove" (after the undo window): the item stays hidden until the list is read again. */
  const remove = useCallback(
    async (item: FoodItem) => {
      const result = await run(async () => {
        const text = nutritionLibraryCopy[getActiveLanguage()];
        const outcome = await deleteFood(item.id);
        return fill(outcome.outcome === 'archived' ? text.removedArchived : text.removedDeleted, { name: item.name });
      }, copy.foodSaveError);
      if (result.ok) markDone(item.id);
      else show(item.id);
      return result;
    },
    [run, copy.foodSaveError, markDone, show],
  );

  const restore = useCallback(
    (item: FoodItem) =>
      run(async () => {
        await restoreFood(item.id);
        return fill(nutritionLibraryCopy[getActiveLanguage()].restored, { name: item.name });
      }, copy.foodSaveError),
    [run, copy.foodSaveError],
  );

  return {
    isReady: data !== undefined,
    error: data ? undefined : error,
    isLoading,
    reload,
    caps,
    counts,
    activeCount,
    sections,
    groupItems,
    filter: { group, category, query, showArchived },
    setGroup,
    setCategory,
    setQuery,
    setShowArchived,
    save,
    remove,
    restore,
    hide: hiddenItems.hide,
    show,
  };
}
