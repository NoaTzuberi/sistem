import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_TRAINEE_TAB, TRAINEE_TABS, TRAINEE_TAB_PARAM } from '../../../app/config/routes';
import type { TraineeTab } from '../../../app/config/routes';

const STORAGE_PREFIX = 'sistem.dashboard.traineeTab.';

function isTraineeTab(value: string | null): value is TraineeTab {
  return (TRAINEE_TABS as readonly string[]).includes(value ?? '');
}

function readStored(traineeId: string): TraineeTab | null {
  try {
    const value = localStorage.getItem(STORAGE_PREFIX + traineeId);
    return isTraineeTab(value) ? value : null;
  } catch {
    return null;
  }
}

function store(traineeId: string, tab: TraineeTab): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + traineeId, tab);
  } catch {
    // Blocked storage: the URL still holds the tab.
  }
}

/**
 * The profile's open tab: the URL (?tab=) is the truth, so refresh, back and links work. Opening her
 * profile without a tab returns to the one the coach had open last for her (kept on this browser).
 */
export function useTraineeTab(traineeId: string): [TraineeTab, (tab: TraineeTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get(TRAINEE_TAB_PARAM);
  const tab = isTraineeTab(requested) ? requested : DEFAULT_TRAINEE_TAB;

  const selectTab = useCallback(
    (next: TraineeTab) => {
      store(traineeId, next);
      setSearchParams(next === DEFAULT_TRAINEE_TAB ? {} : { [TRAINEE_TAB_PARAM]: next }, { replace: true });
    },
    [setSearchParams, traineeId],
  );

  // A link without a tab (the list, the drawer, search): back to her last tab.
  useEffect(() => {
    if (requested !== null) {
      if (isTraineeTab(requested)) store(traineeId, requested);
      return;
    }
    const last = readStored(traineeId);
    if (last && last !== DEFAULT_TRAINEE_TAB) setSearchParams({ [TRAINEE_TAB_PARAM]: last }, { replace: true });
    // Only when she is opened (or the tab param disappears), not on every render.
  }, [requested, traineeId, setSearchParams]);

  return [tab, selectTab];
}
