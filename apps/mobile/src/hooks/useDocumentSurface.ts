import { useEffect } from 'react';

/**
 * While a full-bleed screen is open: <html data-surface="<surface>"> (its CSS gives html / body the
 * screen's bottom color, so iOS Safari's bars, the area under its floating toolbar and the overscroll
 * match) and a theme-color meta read from `themeColorToken` (Android Chrome, older iOS). Both are
 * removed on leave.
 */
export function useDocumentSurface(surface: string, themeColorToken: string) {
  useEffect(() => {
    const root = document.documentElement;
    // An overlay (the interval timer over the workout player) puts back the screen's surface under it;
    // on navigation the next screen's effect runs after this cleanup and sets its own anyway.
    const previous = root.dataset.surface;
    root.dataset.surface = surface;
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = getComputedStyle(root).getPropertyValue(themeColorToken).trim();
    document.head.appendChild(meta);
    return () => {
      if (previous === undefined) delete root.dataset.surface;
      else root.dataset.surface = previous;
      meta.remove();
    };
  }, [surface, themeColorToken]);
}
