import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Items a pending delete hides (useUndoToast): hidden at once, shown again on "Undo" or a failed delete.
 * After the delete went through, an item stays hidden until the list is read again (`data` changes),
 * so it never flashes back between the server's answer and the fresh list.
 */
export function useHiddenItems(data: unknown) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  // Deleted on the server, waiting for the fresh list (a ref: marking one must not re-render or re-run the effect).
  const done = useRef(new Set<string>());

  const hide = useCallback((id: string) => setHidden((current) => new Set(current).add(id)), []);

  const show = useCallback((id: string) => {
    setHidden((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const markDone = useCallback((id: string) => {
    done.current.add(id);
  }, []);

  useEffect(() => {
    if (done.current.size === 0) return;
    const finished = new Set(done.current);
    done.current.clear();
    setHidden((current) => new Set([...current].filter((id) => !finished.has(id))));
  }, [data]);

  return { hidden, hide, show, markDone };
}
