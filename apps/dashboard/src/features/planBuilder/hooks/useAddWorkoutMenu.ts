import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

const GAP = 8;
const EDGE = 12;

/** Where the menu sits: under the trigger at its reading-start edge; above it, or shifted inward, when there's no room. */
function placeMenu(trigger: DOMRect, menu: { width: number; height: number }, isRtl: boolean) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const below = trigger.bottom + GAP;
  const opensUp = below + menu.height > viewportHeight - EDGE && trigger.top - GAP - menu.height >= EDGE;
  const top = opensUp ? trigger.top - GAP - menu.height : below;
  // Aligned with the trigger's reading-start edge, then kept inside the screen.
  const preferredLeft = isRtl ? trigger.right - menu.width : trigger.left;
  const left = Math.min(Math.max(EDGE, preferredLeft), viewportWidth - menu.width - EDGE);
  const originX = isRtl ? 'right' : 'left';
  return { top, left, origin: `${opensUp ? 'bottom' : 'top'} ${originX}` };
}

/**
 * The "+ אימון" menu: open / close, its place next to the trigger (fixed, in a portal, so no
 * scrolling row or card can clip it), outside press and Esc close it with the focus back on the
 * trigger, ↑ ↓ Home End move between the rows. Re-placed on scroll and resize while open.
 */
export function useAddWorkoutMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const isRtl = getComputedStyle(trigger).direction === 'rtl';
    const { top, left, origin } = placeMenu(trigger.getBoundingClientRect(), { width: menu.offsetWidth, height: menu.offsetHeight }, isRtl);
    // Only CSS variables: the stylesheet places the menu with them.
    setStyle({ '--awm-top': `${top}px`, '--awm-left': `${left}px`, '--awm-origin': origin } as CSSProperties);
  }, []);

  useLayoutEffect(() => {
    if (isOpen) place();
  }, [isOpen, place]);

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen, close, place]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close(false);
      return;
    }
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    items[next]?.focus();
  }

  return {
    isOpen,
    style,
    triggerRef,
    menuRef,
    toggle: () => setIsOpen((open) => !open),
    /** Runs a row's action after closing (the new workout then takes the focus / scroll). */
    select: (action: () => void) => {
      close(false);
      action();
    },
    onMenuKeyDown,
  };
}
