import { useEffect, useSyncExternalStore } from 'react';

const POLL_MS = 30_000;

/**
 * One unread-messages count for the app (the coach dock badge, the trainee's Home): set from any
 * screen that learns a newer number, polled while mounted and on focus. No push yet (Phase 5b).
 */
export function createUnreadStore(fetchCount: () => Promise<number>) {
  let count = 0;
  const listeners = new Set<() => void>();

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function set(next: number): void {
    count = Math.max(0, next);
    listeners.forEach((listener) => listener());
  }

  async function refresh(): Promise<void> {
    try {
      set(await fetchCount());
    } catch {
      // A failed poll keeps the last known count.
    }
  }

  function useCount(enabled = true): number {
    useEffect(() => {
      if (!enabled) return;
      void refresh();
      const timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void refresh();
      }, POLL_MS);
      window.addEventListener('focus', refresh);
      return () => {
        window.clearInterval(timer);
        window.removeEventListener('focus', refresh);
      };
    }, [enabled]);
    return useSyncExternalStore(subscribe, () => count);
  }

  return { set, refresh, useCount };
}
