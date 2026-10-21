import { useCallback, useState } from 'react';
import type { FoodGroup } from '@sistem/types';

/**
 * The food sheet's state: which group is open (null = closed), the search, and the foods she marked
 * "I ate this" while it was open (they show "Marked"; forgotten when the sheet opens again). BottomSheet
 * returns the focus to the opener itself.
 */
export function useNutritionSheet() {
  const [group, setGroup] = useState<FoodGroup | null>(null);
  const [query, setQuery] = useState('');
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set());

  const open = useCallback((next: FoodGroup) => {
    setGroup(next);
    setQuery('');
    setMarked(new Set());
  }, []);

  const close = useCallback(() => setGroup(null), []);

  const switchGroup = useCallback((next: FoodGroup) => {
    setGroup(next);
    setQuery('');
  }, []);

  const markFood = useCallback((foodId: string) => setMarked((current) => new Set(current).add(foodId)), []);

  return { group, query, marked, open, close, switchGroup, setQuery, markFood };
}
