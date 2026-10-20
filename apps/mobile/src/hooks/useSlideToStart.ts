import { type MouseEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { hapticImpact } from '../services/haptics/haptics';

/** How far (of the track) counts as "slid to the end". */
const COMPLETE_AT = 0.8;

export type SlideState = 'idle' | 'dragging' | 'snapping' | 'done';

interface SlideOptions {
  onComplete: () => void;
  /** The start is in flight; when it ends without leaving the screen (an error, a question) the slide resets. */
  busy?: boolean;
  /** Go back to the start this long after completing (Home stays on screen when the start fails). */
  resetAfterMs?: number;
}

/**
 * Slide-to-start: drag the knob toward the reading direction's end past 80% to fire `onComplete`;
 * let go earlier and it springs back. The knob is a button, so Enter / Space complete it too.
 * Nothing re-renders while dragging: the hook writes CSS variables on the root —
 * --x (the knob's offset, px), --p (0…1 of the way) and --tw (the track's width, px, for the trail's gradient).
 */
export function useSlideToStart({ onComplete, busy = false, resetAfterMs }: SlideOptions) {
  const rootRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<SlideState>('idle');
  const stateRef = useRef<SlideState>('idle');
  const drag = useRef<{ pointerId: number; startX: number; max: number; direction: number; x: number } | null>(null);
  const wasBusy = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const changeState = useCallback((next: SlideState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const maxOffset = useCallback((): number => {
    const root = rootRef.current;
    const knob = knobRef.current;
    if (!root || !knob) return 0;
    const inset = (root.clientHeight - knob.offsetHeight) / 2;
    return Math.max(0, root.clientWidth - knob.offsetWidth - inset * 2);
  }, []);

  const setOffset = useCallback((x: number, max: number) => {
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty('--x', `${x}px`);
    root.style.setProperty('--p', String(max > 0 ? Math.min(1, x / max) : 0));
  }, []);

  const reset = useCallback(() => {
    drag.current = null;
    changeState('snapping');
    setOffset(0, maxOffset());
  }, [changeState, maxOffset, setOffset]);

  const complete = useCallback(() => {
    const max = maxOffset();
    setOffset(max, max);
    changeState('done');
    hapticImpact('MEDIUM');
    onCompleteRef.current();
  }, [changeState, maxOffset, setOffset]);

  // The trail's gradient spans the whole track; a done knob stays at the (new) end.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => {
      root.style.setProperty('--tw', `${root.clientWidth}px`);
      if (stateRef.current === 'done') {
        const max = maxOffset();
        setOffset(max, max);
      }
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, [maxOffset, setOffset]);

  // A start that ended without navigating (error / conflict): back to the beginning.
  useEffect(() => {
    if (wasBusy.current && !busy && stateRef.current === 'done') reset();
    wasBusy.current = busy;
  }, [busy, reset]);

  useEffect(() => {
    if (state !== 'done' || resetAfterMs === undefined) return;
    const timer = window.setTimeout(() => {
      if (!busy) reset();
    }, resetAfterMs);
    return () => window.clearTimeout(timer);
  }, [state, resetAfterMs, busy, reset]);

  const knobHandlers = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      // One finger: a second touch while dragging is ignored.
      if (drag.current || stateRef.current === 'done' || busy) return;
      const knob = event.currentTarget;
      try {
        knob.setPointerCapture(event.pointerId);
      } catch {
        // The pointer is already gone: the drag still works while it stays on the knob.
      }
      const direction = getComputedStyle(knob).direction === 'rtl' ? -1 : 1;
      drag.current = { pointerId: event.pointerId, startX: event.clientX, max: maxOffset(), direction, x: 0 };
      changeState('dragging');
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.x = Math.max(0, Math.min(current.max, (event.clientX - current.startX) * current.direction));
      setOffset(current.x, current.max);
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
    // Keyboard (Enter / Space make a click with detail 0) completes at once; a tap without a slide does not.
    onClick(event: MouseEvent<HTMLButtonElement>) {
      if (event.detail === 0 && stateRef.current !== 'done' && !busy) complete();
    },
  };

  return {
    rootRef,
    knobRef,
    state,
    knobHandlers,
    onSnapEnd: () => {
      if (stateRef.current === 'snapping') changeState('idle');
    },
  };
}
