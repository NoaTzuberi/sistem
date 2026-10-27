import { useEffect } from 'react';

/**
 * While a signed-out screen is open: <html data-surface="auth"> (html / body take the stage's bottom
 * pink, so iOS Safari's bars, the area under its floating toolbar and the overscroll stay pink) and a
 * theme-color meta with the stage's top pink (Android Chrome, older iOS). Both are removed on leave.
 */
export function useAuthSurface() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = 'auth';
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = getComputedStyle(root).getPropertyValue('--color-auth-stage-top').trim();
    document.head.appendChild(meta);
    return () => {
      // Another auth screen may already have mounted (login → sign-up); it sets the attribute again.
      delete root.dataset.surface;
      meta.remove();
    };
  }, []);
}
