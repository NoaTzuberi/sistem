import { useEffect } from 'react';

/**
 * While a signed-out screen is open the browser bars (Android Chrome, older iOS Safari) take the
 * brand pink; other screens keep the browser default. The color is the token's value, read at run time.
 */
export function useAuthThemeColor() {
  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    if (!color) return;
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
