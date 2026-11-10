import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

/**
 * A modal's keyboard rules: Esc cancels, Tab stays on its buttons, the focus starts on
 * `initialFocusRef` (the safe answer) and goes back to what opened it on close.
 */
export function useDialogFocus(isOpen: boolean, isMounted: boolean, onCancel: () => void, cardRef: RefObject<HTMLElement | null>, initialFocusRef: RefObject<HTMLElement | null>) {
  // The latest handler, so a parent re-render never re-runs the effect (and moves the focus).
  const cancelHandler = useRef(onCancel);
  useEffect(() => {
    cancelHandler.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') cancelHandler.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isMounted) initialFocusRef.current?.focus();
  }, [isOpen, isMounted, initialFocusRef]);

  return function keepFocusInside(event: ReactKeyboardEvent) {
    if (event.key !== 'Tab' || !cardRef.current) return;
    const buttons = [...cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
}
