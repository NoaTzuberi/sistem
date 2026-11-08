import { useEffect } from 'react';
import type { RefObject } from 'react';

interface TourKeys {
  isActive: boolean;
  /** The card is in the page (it mounts a frame after the tour opens). */
  isCardMounted: boolean;
  isRtl: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * The tour's keyboard: Esc = skip; the arrow toward the reading direction = next, the other = back;
 * Tab stays inside the card. The focus starts on the card's main button and goes back where it was.
 */
export function useTourKeyboard(
  cardRef: RefObject<HTMLElement | null>,
  stepKey: string | null,
  { isActive, isCardMounted, isRtl, onNext, onBack, onSkip }: TourKeys,
) {
  // Back to what had the focus when the tour opened.
  useEffect(() => {
    if (!isActive) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => before?.focus({ preventScroll: true });
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !isCardMounted) return;
    cardRef.current?.querySelector<HTMLElement>('[data-tour-primary]')?.focus({ preventScroll: true });
  }, [cardRef, isActive, isCardMounted, stepKey]);

  useEffect(() => {
    if (!isActive) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onSkip();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const forward = (event.key === 'ArrowLeft') === isRtl;
        if (forward) onNext();
        else onBack();
        return;
      }
      if (event.key !== 'Tab' || !cardRef.current) return;
      const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = cardRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }
    // Capture: the page's own shortcuts (⌘K, "/") never see a key while the tour is open.
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [cardRef, isActive, isRtl, onNext, onBack, onSkip]);
}
