import { useLayoutEffect, useSyncExternalStore } from 'react';

// Whether the screen on show wants the dock. The dock is ONE element outside the screens (so its pill
// can animate between tabs and it never moves with a screen in transition); each AppShell that shows
// it asks for it while mounted.

let requests = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called by AppShell: show the dock while this screen is mounted (and wants it). */
export function useDockRequest(wanted: boolean): void {
  useLayoutEffect(() => {
    if (!wanted) return;
    requests += 1;
    emit();
    return () => {
      requests -= 1;
      emit();
    };
  }, [wanted]);
}

export function useDockVisible(): boolean {
  return useSyncExternalStore(subscribe, () => requests > 0);
}
