import { useEffect, useState } from 'react';
import type { ExerciseFacts } from '@sistem/types';
import { getActiveLanguage } from '@sistem/shared';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { searchFreeExercises } from '../../../services/workoutLogs/freeWorkoutService';
import { workoutCopy } from '../copy';

const SEARCH_DEBOUNCE_MS = 250;

/** The free workout's exercise picker: the server's search over what fits her equipment and level. */
export function useFreeExercisePicker(isOpen: boolean) {
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [items, setItems] = useState<ExerciseFacts[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    setItems(null);
    setError(null);
    searchFreeExercises(search.trim())
      .then((found) => isCurrent && setItems(found))
      .catch(() => isCurrent && setError(workoutCopy[getActiveLanguage()].free.loadError));
    return () => {
      isCurrent = false;
    };
  }, [isOpen, search, attempt]);

  return { query, setQuery, items, error, retry: () => setAttempt((count) => count + 1), reset: () => setQuery('') };
}
