import { useEffect } from 'react';

/**
 * While `isDirty`: the browser asks before a reload / tab close, and a click on an in-app link asks
 * `confirmText` first (the app's router has no navigation blocker). Back / forward are not caught.
 */
export function useUnsavedChangesGuard(isDirty: boolean, confirmText: string) {
  useEffect(() => {
    if (!isDirty) return;
    const warnOnUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const confirmLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.origin !== window.location.origin) return;
      if (!window.confirm(confirmText)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warnOnUnload);
    // Capture: before the router's own link handler.
    document.addEventListener('click', confirmLink, true);
    return () => {
      window.removeEventListener('beforeunload', warnOnUnload);
      document.removeEventListener('click', confirmLink, true);
    };
  }, [isDirty, confirmText]);
}
