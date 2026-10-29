import { useCallback, useMemo, useState } from 'react';
import type { FoodGroup, FoodItem, FoodItemPayload } from '@sistem/types';
import { errorText } from '../data/errorText';
import { FOOD_GROUPS, fill, getActiveLanguage, sharedCopy, useCopy, useLoad } from '@sistem/shared';
import type { CategoryFilter } from '../../nutrition/data/foodFilters';
import { SOURCE_FILTERS, filterFoods, matchesSource } from '../data/foodLibrary';
import type { SourceFilter } from '../data/foodLibrary';
import { coachFoodSource } from '../data/foodSources';
import type { FoodBankSource } from '../data/foodSources';
import { useHiddenItems } from '../../../hooks/useHiddenItems';
import { nutritionLibraryCopy } from '../copy';

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
 * A food list (PRD §5.6) with its filters: a group (or all), a category of that group, a search over
 * name and category, the archive, and — in the coach's library — the source (all / mine / hidden).
 * `source` = where it reads and writes: the coach's library (default) or the admin's system bank. Every
 * change goes to the server, then the list is read again — the server decides copy-on-write, delete vs
 * archive and the group caps.
 */
export function useFoods(source: FoodBankSource = coachFoodSource) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionLibraryCopy);
  const { data, error, isLoading, reload } = useLoad(source.load, copy.foodsLoadError);
  const [group, setGroupState] = useState<FoodGroup | null>(null);
  const [category, setCategory] = useState<CategoryFilter>(null);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

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

  // The chips count what the source and archive filters show; the search narrows only the cards.
  const shown = useMemo(
    () => foods.filter((food) => matchesSource(food, sourceFilter) && (showArchived || !food.archivedAt)),
    [foods, sourceFilter, showArchived],
  );
  const counts = useMemo(
    () => ({
      all: shown.length,
      byGroup: Object.fromEntries(FOOD_GROUPS.map((id) => [id, shown.filter((food) => food.group === id).length])) as Record<FoodGroup, number>,
    }),
    [shown],
  );
  const sourceCounts = useMemo(
    () => Object.fromEntries(SOURCE_FILTERS.map((id) => [id, foods.filter((food) => matchesSource(food, id) && !food.archivedAt).length])) as Record<SourceFilter, number>,
    [foods],
  );

  const activeCount = useMemo(() => foods.filter((food) => !food.archivedAt && !food.hidden).length, [foods]);

  const sections = useMemo<FoodSection[]>(() => {
    if (!caps) return [];
    const searchText = (item: FoodItem) => `${item.name} ${item.category ? shared.nutrition.categories[item.category] : ''}`;
    const visible = filterFoods(foods, { group, category, query, showArchived, source: sourceFilter }, searchText);
    return FOOD_GROUPS.filter((id) => group === null || id === group)
      .map((id) => ({ group: id, cap: caps[id], items: visible.filter((food) => food.group === id) }))
      .filter((section) => section.items.length > 0 || (group !== null && query.trim() === '' && sourceFilter === 'all'));
  }, [foods, caps, group, category, query, showArchived, sourceFilter, shared]);

  /** The items of the chosen group the filters show — what the category chips offer. */
  const groupItems = useMemo(() => (group === null ? [] : shown.filter((food) => food.group === group)), [shown, group]);

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
        const saved = item ? await source.update(item.id, payload) : await source.create(payload);
        // Her edit of a system item became her own copy (the original is unchanged).
        if (item && item.source === 'system' && saved.source === 'mine') return fill(text.savedAsMine, { name: saved.name });
        return fill(item ? text.saved : text.added, { name: saved.name });
      }, copy.foodSaveError),
    [run, source, copy.foodSaveError],
  );

  const { markDone, show } = hiddenItems;
  /** The server call behind "remove" (after the undo window): the item stays hidden until the list is read again. */
  const remove = useCallback(
    async (item: FoodItem) => {
      const result = await run(async () => {
        const text = nutritionLibraryCopy[getActiveLanguage()];
        const outcome = await source.remove(item.id);
        return fill(outcome.outcome === 'archived' ? text.removedArchived : text.removedDeleted, { name: item.name });
      }, copy.foodSaveError);
      if (result.ok) markDone(item.id);
      else show(item.id);
      return result;
    },
    [run, source, copy.foodSaveError, markDone, show],
  );

  /** Her edited copy goes; the system original is back in her lists and plans. */
  const revert = useCallback(
    (item: FoodItem) =>
      run(async () => {
        await source.remove(item.id);
        return fill(nutritionLibraryCopy[getActiveLanguage()].reverted, { name: item.name });
      }, copy.foodSaveError),
    [run, source, copy.foodSaveError],
  );

  const restore = useCallback(
    (item: FoodItem) =>
      run(async () => {
        await source.restore(item.id);
        return fill(nutritionLibraryCopy[getActiveLanguage()].restored, { name: item.name });
      }, copy.foodSaveError),
    [run, source, copy.foodSaveError],
  );

  const { setHidden: setSourceHidden } = source;
  /** A system item out of her lists, or back in them (coach only). */
  const setHiddenInLists = useMemo(
    () =>
      setSourceHidden &&
      ((item: FoodItem, isHidden: boolean) =>
        run(async () => {
          await setSourceHidden(item.id, isHidden);
          const text = nutritionLibraryCopy[getActiveLanguage()];
          return fill(isHidden ? text.hiddenDone : text.unhiddenDone, { name: item.name });
        }, copy.foodSaveError)),
    [setSourceHidden, run, copy.foodSaveError],
  );

  return {
    isReady: data !== undefined,
    /** Nothing at all in the list (not a filter / search with no match). */
    isEmpty: data !== undefined && data.foods.length === 0,
    error: data ? undefined : error,
    isLoading,
    reload,
    caps,
    counts,
    sourceCounts,
    activeCount,
    sections,
    groupItems,
    filter: { group, category, query, showArchived, source: sourceFilter },
    setGroup,
    setCategory,
    setQuery,
    setShowArchived,
    setSourceFilter,
    save,
    remove,
    revert,
    restore,
    setHiddenInLists,
    hide: hiddenItems.hide,
    show,
  };
}
