import type { PointerEvent } from 'react';

const MAX_TILT_DEG = 8;

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function lean(card: HTMLElement, clientX: number, clientY: number) {
  const box = card.getBoundingClientRect();
  const x = Math.min(0.5, Math.max(-0.5, (clientX - box.left) / box.width - 0.5));
  const y = Math.min(0.5, Math.max(-0.5, (clientY - box.top) / box.height - 0.5));
  card.style.setProperty('--tilt-x', `${(-y * MAX_TILT_DEG * 2).toFixed(1)}deg`);
  card.style.setProperty('--tilt-y', `${(x * MAX_TILT_DEG * 2).toFixed(1)}deg`);
  card.style.setProperty('--spot-x', `${((x + 0.5) * 100).toFixed(0)}%`);
  card.style.setProperty('--spot-y', `${((y + 0.5) * 100).toFixed(0)}%`);
  card.dataset.tilting = '';
}

function settle(card: HTMLElement) {
  card.style.removeProperty('--tilt-x');
  card.style.removeProperty('--tilt-y');
  delete card.dataset.tilting;
}

/**
 * A badge card that leans toward the pointer (±8°) and carries a sheen where it is: the handlers write
 * --tilt-x / --tilt-y / --spot-x / --spot-y and [data-tilting] on the card; its CSS uses them and springs
 * back when they go. A mouse tilts on hover; a finger or pen tilts while pressed. Reduced motion: nothing.
 * MIRROR of apps/dashboard/src/features/trainees/hooks/useTilt.ts — change both.
 */
export function useTilt() {
  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' || reducedMotion()) return;
    lean(event.currentTarget, event.clientX, event.clientY);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (reducedMotion()) return;
    const card = event.currentTarget;
    if (event.pointerType === 'mouse' ? canHover() : 'tilting' in card.dataset) lean(card, event.clientX, event.clientY);
  }

  function onPointerEnd(event: PointerEvent<HTMLElement>) {
    // A mouse button going up keeps the hover tilt; a finger lifting ends it.
    if (event.type === 'pointerup' && event.pointerType === 'mouse') return;
    settle(event.currentTarget);
  }

  return { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onPointerLeave: onPointerEnd };
}
