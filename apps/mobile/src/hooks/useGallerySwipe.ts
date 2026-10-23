import { useRef } from 'react';
import type { PointerEvent } from 'react';

/** A horizontal swipe past this many pixels moves to the next / previous photo. */
const SWIPE_PX = 50;

/**
 * Swipe between photos: `onNext` / `onPrevious` follow the reading direction (in Hebrew a swipe to the
 * right shows the next photo). Vertical drags are ignored.
 */
export function useGallerySwipe(isRtl: boolean, onNext: () => void, onPrevious: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (event: PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dx = event.clientX - from.x;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(event.clientY - from.y)) return;
      // physical: a finger moving left reveals what is to the right
      const towardsEnd = isRtl ? dx > 0 : dx < 0;
      if (towardsEnd) onNext();
      else onPrevious();
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
