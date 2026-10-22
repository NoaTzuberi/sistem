import { useEffect, useState } from 'react';

/**
 * A panel that slides in and out: it must be in the page one frame before it is shown (so the
 * slide-in runs), and stay until the slide-out is over. `exitMs` = the CSS closing duration.
 */
export function useDrawerTransition(isOpen: boolean, exitMs: number): { isMounted: boolean; isShown: boolean } {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Two frames: the first paints the closed position, the second starts the slide.
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setIsShown(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setIsShown(false);
    const timer = window.setTimeout(() => setIsMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, exitMs]);

  return { isMounted, isShown };
}
