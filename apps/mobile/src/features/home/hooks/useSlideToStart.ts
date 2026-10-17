import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { hapticImpact } from '../../../services/haptics/haptics';

/** How far (of the track) counts as "slid to the end". */
const COMPLETE_AT = 0.8;

export type SlideState = 'idle' | 'dragging' | 'snapping' | 'done';

/**
 * Slide-to-start: drag the knob along the track (toward the reading direction's end) past 80% to
 * fire `onComplete`; let go earlier and it springs back. The knob is a button, so Enter / Space
 * start it too. The offset is written to `--slide-x` on the track (no re-render per move).
 * `busy` = the start is in flight; when it ends without leaving the screen (an error, the conflict
 * question) the slider resets.
 */
export function useSlideToStart(onComplete: () => void, busy: boolean) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<SlideState>('idle');
  const drag = useRef<{ pointerId: number; startX: number; max: number; direction: number; x: number } | null>(null);
  const wasBusy = useRef(false);

  function setOffset(x: number) {
    trackRef.current?.style.setProperty('--slide-x', `${x}px`);
  }

  function maxOffset(knob: HTMLElement): number {
    const track = trackRef.current;
    if (!track) return 0;
    const inset = knob.offsetLeft > 0 ? Math.min(knob.offsetLeft, track.clientWidth - knob.offsetLeft - knob.offsetWidth) : 0;
    return Math.max(0, track.clientWidth - knob.offsetWidth - inset * 2);
  }

  function complete() {
    const knob = trackRef.current?.querySelector<HTMLElement>('[data-slide-knob]');
    if (knob) setOffset(maxOffset(knob));
    setState('done');
    hapticImpact('MEDIUM');
    onComplete();
  }

  function reset() {
    drag.current = null;
    setState('snapping');
    setOffset(0);
  }

  // A start that ended without navigating (error / conflict): back to the beginning.
  useEffect(() => {
    if (wasBusy.current && !busy && state === 'done') reset();
    wasBusy.current = busy;
  }, [busy, state]);

  const knobHandlers = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (state === 'done' || busy) return;
      const knob = event.currentTarget;
      try {
        knob.setPointerCapture(event.pointerId);
      } catch {
        // The pointer is already gone: the drag still works while it stays on the knob.
      }
      const direction = getComputedStyle(knob).direction === 'rtl' ? -1 : 1;
      drag.current = { pointerId: event.pointerId, startX: event.clientX, max: maxOffset(knob), direction, x: 0 };
      setState('dragging');
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.x = Math.max(0, Math.min(current.max, (event.clientX - current.startX) * current.direction));
      setOffset(current.x);
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null;
      if (current.max > 0 && current.x >= current.max * COMPLETE_AT) complete();
      else reset();
    },
    onPointerCancel() {
      if (drag.current) reset();
    },
    // Keyboard (Enter / Space make a click with detail 0) starts at once; a tap without a slide does not.
    onClick(event: MouseEvent<HTMLButtonElement>) {
      if (event.detail === 0 && state !== 'done' && !busy) complete();
    },
  };

  return { trackRef, state, knobHandlers, onSnapEnd: () => state === 'snapping' && setState('idle') };
}
