import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoachActivityItem } from '@sistem/types';
import { getCoachActivity } from '../../../services/coach/coachService';

const PAGE_SIZE = 20;

/** The Today feed: the first page on open, then "more" pages by the server's cursor. */
export function useActivityFeed() {
  const [items, setItems] = useState<CoachActivityItem[]>();
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<'load' | 'loadMore'>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // A reload that lands after a newer one is dropped.
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const page = await getCoachActivity(null, PAGE_SIZE);
      if (id !== requestId.current) return;
      setItems(page.items);
      setNextBefore(page.nextBefore);
      setError(undefined);
    } catch {
      if (id === requestId.current) setError('load');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function loadMore() {
    if (!nextBefore || isLoadingMore) return;
    setIsLoadingMore(true);
    const id = requestId.current;
    try {
      const page = await getCoachActivity(nextBefore, PAGE_SIZE);
      if (id !== requestId.current) return;
      setItems((current) => {
        const known = new Set((current ?? []).map((item) => item.id));
        return [...(current ?? []), ...page.items.filter((item) => !known.has(item.id))];
      });
      setNextBefore(page.nextBefore);
      setError(undefined);
    } catch {
      setError('loadMore');
    } finally {
      setIsLoadingMore(false);
    }
  }

  return { items, hasMore: nextBefore !== null, error, isLoadingMore, loadMore, reload };
}
