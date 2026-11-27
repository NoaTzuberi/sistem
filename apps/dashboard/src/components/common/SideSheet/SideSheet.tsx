import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sharedCopy, useCopy } from '@sistem/shared';
import { useDrawerTransition } from '../../../hooks/useDrawerTransition';
import { Icon } from '../Icon/Icon';
import { RoundButton } from '../RoundButton/RoundButton';
import './SideSheet.css';

// = --transition-drawer-out: the sheet leaves the page once its slide-out is over.
const CLOSE_MS = 200;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary';

interface SideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Stays at the bottom of the sheet (its buttons). */
  footer?: ReactNode;
  children: ReactNode;
  /** Blur the page behind the scrim (the nutrition library's food sheet). */
  blurScrim?: boolean;
}

/**
 * A floating side sheet — the same shell as the trainee drawer: in on the drawer curve, out
 * faster; Esc and the scrim close it; Tab stays inside; the focus goes back to what opened it.
 * While closed it is not in the page at all, so it can never sit over the buttons under it.
 */
export function SideSheet({ isOpen, onClose, title, subtitle, footer, children, blurScrim = false }: SideSheetProps) {
  const shared = useCopy(sharedCopy);
  const { isMounted, isShown } = useDrawerTransition(isOpen, CLOSE_MS);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // The latest handler: callers often pass a new function every render (a typed letter re-renders
  // the form), and re-running the effect below would send the focus back to the opener each time.
  const closeHandler = useRef(onClose);
  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);

  // Esc closes; the focus returns to whatever opened the sheet — only when it closes.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeHandler.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  // The first field of the sheet (a search) takes the focus, else its close button.
  useEffect(() => {
    if (!isOpen || !isMounted) return;
    const field = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
    (field ?? closeRef.current)?.focus();
  }, [isOpen, isMounted]);

  function keepFocusInside(event: ReactKeyboardEvent) {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  if (!isMounted) return null;

  return createPortal(
    <>
      <div className={['sheet-scrim', isShown && 'sheet-scrim-shown', blurScrim && 'sheet-scrim-blur'].filter(Boolean).join(' ')} onClick={onClose} />
      <aside
        ref={panelRef}
        className={isShown ? 'side-sheet side-sheet-shown' : 'side-sheet'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!isOpen}
        onKeyDown={keepFocusInside}
      >
        <header className="sheet-header">
          <div className="sheet-heading">
            <h2 className="sheet-title" id={titleId}>
              {title}
            </h2>
            {subtitle && (
              <p className="sheet-subtitle" dir="auto">
                {subtitle}
              </p>
            )}
          </div>
          <RoundButton ref={closeRef} label={shared.common.close} variant="outline" onClick={onClose}>
            <Icon name="close" size="sm" />
          </RoundButton>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-footer">{footer}</footer>}
      </aside>
    </>,
    document.body,
  );
}
