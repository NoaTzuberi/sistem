import { useCallback, useEffect } from 'react';
import { useCopy, useLoad } from '@sistem/shared';
import { listThreads } from '../../../services/coach/coachConnectService';
import { coachCopy } from '../copy';
import { coachMessageUnread } from '../data/coachUnread';

/** The Messages tab: her threads, refetched on focus (no push yet); keeps the dock badge in step. */
export function useThreads() {
  const copy = useCopy(coachCopy).messages;
  const load = useCallback(async () => {
    const list = await listThreads();
    coachMessageUnread.set(list.unreadTotal);
    return list;
  }, []);
  const threads = useLoad(load, copy.loadError);
  const { reload } = threads;

  useEffect(() => {
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [reload]);

  return threads;
}
