import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// A bottom sheet's behaviour (BottomSheet renders it): mount → open on the next frame (the CSS
// transition plays), stay mounted while it closes, focus moves in / is trapped / goes back, Esc closes,
// the page behind doesn't scroll, and the grab handle drags it down (released past the distance or
// flicked = close, else it springs back).

/** Must match --transition-drawer-out (the close transition). */
const CLOSE_MS = 200;
const DRAG_CLOSE_DISTANCE = 90;
const DRAG_CLOSE_VELOCITY = 0.5; // px / ms
const TAP_SLOP = 6;
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export type SheetPhase = 'closed' | 'opening' | 'open' | 'closing';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useBottomSheet(isOpen: boolean, onClose: () => void) {
  const [phase, setPhase] = useState<SheetPhase>(isOpen ? 'opening' : 'closed');
  const sheetRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const drag = useRef<{ startY: number; startTime: number; offset: number } | null>(null);
  // A drag that ended without closing must not count as a tap on the handle.
  const lastDrag = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Open: mount closed, then flip to open on the next frame so the transform transitions.
  useEffect(() => {
    if (isOpen) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPhase('opening');
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('open')));
      return () => cancelAnimationFrame(frame);
    }
    setPhase((current) => (current === 'closed' ? current : 'closing'));
    const timer = window.setTimeout(() => setPhase('closed'), prefersReducedMotion() ? 0 : CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const mounted = phase !== 'closed';

  // Focus in on open; back to the opener once it is gone.
  useEffect(() => {
    if (phase !== 'open') return;
    const sheet = sheetRef.current;
    const first = sheet?.querySelector<HTMLElement>('[data-autofocus]') ?? sheet?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? sheet)?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (mounted) return;
    returnFocus.current?.focus({ preventScroll: true });
    returnFocus.current = null;
  }, [mounted]);

  // Esc, the focus trap, and no page scroll behind.
  useEffect(() => {
    if (!mounted || !isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, isOpen]);

  // Drag the handle: the sheet follows the finger directly (no React render per move).
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!sheetRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startTime: event.timeStamp, offset: 0 };
    sheetRef.current.dataset.dragging = 'true';
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || !sheetRef.current) return;
    const delta = event.clientY - state.startY;
    // Upward: a little resistance instead of a hard stop.
    state.offset = delta > 0 ? delta : delta / 6;
    sheetRef.current.style.setProperty('--sheet-drag', `${state.offset}px`);
  }, []);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = drag.current;
    const sheet = sheetRef.current;
    drag.current = null;
    if (!state || !sheet) return;
    lastDrag.current = Math.abs(state.offset);
    delete sheet.dataset.dragging;
    sheet.style.removeProperty('--sheet-drag');
    const velocity = state.offset / Math.max(1, event.timeStamp - state.startTime);
    if (state.offset > DRAG_CLOSE_DISTANCE || velocity > DRAG_CLOSE_VELOCITY) onCloseRef.current();
  }, []);

  // A tap on the handle closes too (it is also the sheet's close button for VoiceOver / keyboard).
  const onClick = useCallback(() => {
    if (lastDrag.current > TAP_SLOP) {
      lastDrag.current = 0;
      return;
    }
    onCloseRef.current();
  }, []);

  return {
    mounted,
    phase,
    sheetRef,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClick },
  };
}
