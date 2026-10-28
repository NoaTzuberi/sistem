import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useDrawerTransition } from '../../../hooks/useDrawerTransition';
import { PillButton } from '../PillButton/PillButton';
import type { PillButtonVariant } from '../PillButton/PillButton';
import './ConfirmDialog.css';

// = --transition-drawer-out: the dialog leaves the page once its fade-out is over.
const CLOSE_MS = 200;

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** The confirm button's look (default primary pink). */
  confirmVariant?: PillButtonVariant;
  /** The action is running: both buttons wait. */
  busy?: boolean;
  /** A failed action's line, shown above the buttons. */
  error?: string | null;
}

/**
 * A small centered question (instead of window.confirm): Esc and the scrim cancel, Tab stays on its
 * two buttons, the focus starts on Cancel (the safe answer) and goes back to what opened it.
 */
export function ConfirmDialog({ isOpen, title, text, confirmLabel, cancelLabel, onConfirm, onCancel, confirmVariant = 'primary', busy = false, error = null }: ConfirmDialogProps) {
  const { isMounted, isShown } = useDrawerTransition(isOpen, CLOSE_MS);
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
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
    if (isOpen && isMounted) cancelRef.current?.focus();
  }, [isOpen, isMounted]);

  function keepFocusInside(event: ReactKeyboardEvent) {
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
  }

  if (!isMounted) return null;

  return createPortal(
    <div className={isShown ? 'confirm-dialog-scrim confirm-dialog-shown' : 'confirm-dialog-scrim'} onClick={onCancel}>
      <div
        ref={cardRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        inert={!isOpen}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={keepFocusInside}
      >
        <h2 className="confirm-dialog-title" id={titleId}>
          {title}
        </h2>
        <p className="confirm-dialog-text" id={textId}>
          {text}
        </p>
        {error && (
          <p className="confirm-dialog-error" role="alert">
            {error}
          </p>
        )}
        <div className="confirm-dialog-actions">
          <PillButton ref={cancelRef} variant="fill" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </PillButton>
          <PillButton variant={confirmVariant} onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
            {confirmLabel}
          </PillButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
