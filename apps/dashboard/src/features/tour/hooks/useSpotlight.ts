import { useEffect, useState } from 'react';
import type { TourStep } from '../data/tourSteps';

/** How long a step waits for its element after a page change before it settles on the centered card. */
const FIND_TIMEOUT_MS = 1500;

export interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function isShown(element: HTMLElement): boolean {
  if (element.closest('[inert]')) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** The first shown element among the targets, and its rank (0 = the preferred one). */
function findTarget(targets: string[]): { element: HTMLElement; rank: number } | null {
  for (const [rank, id] of targets.entries()) {
    const element = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)).find(isShown);
    if (element) return { element, rank };
  }
  return null;
}

/**
 * The first shown element among the step's targets (data-tour marks) and its box, kept in step with scroll,
 * resize and its own size. null = none on this page (the card shows centered).
 */
export function useSpotlight(step: TourStep | null, reducedMotion: boolean): SpotRect | null {
  const [rect, setRect] = useState<SpotRect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!step) return;
    const { targets } = step;
    let element: HTMLElement | null = null;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!element || !element.isConnected || !isShown(element)) {
          setRect(null);
          return;
        }
        const box = element.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      });
    };

    const attach = (found: HTMLElement) => {
      element = found;
      const box = found.getBoundingClientRect();
      // Off screen (a long page): bring it into view first.
      if (box.top < 0 || box.bottom > window.innerHeight) {
        found.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
      }
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(found);
      measure();
    };

    // The element may not be there yet (the step just opened its page): watch the DOM for a moment, and
    // trade a fallback (the bell) for the preferred element (the activity card) if that one shows up.
    let rank = Number.POSITIVE_INFINITY;
    const tryFind = () => {
      const found = findTarget(targets);
      if (!found || found.rank >= rank) return;
      rank = found.rank;
      resizeObserver?.disconnect();
      attach(found.element);
      if (rank === 0) observer.disconnect();
    };
    const observer = new MutationObserver(tryFind);
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), FIND_TIMEOUT_MS);
    tryFind();

    window.addEventListener('resize', measure);
    // Capture: any scrolling container moves it, not only the window.
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver?.disconnect();
      window.clearTimeout(timeout);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, reducedMotion]);

  return rect;
}
