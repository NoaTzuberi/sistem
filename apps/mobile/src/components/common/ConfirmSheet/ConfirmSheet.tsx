import { useId } from 'react';
import type { ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { sharedCopy, useCopy } from '@sistem/shared';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import { Spinner } from '../Spinner/Spinner';
import './ConfirmSheet.css';

export type ConfirmTone = 'destructive' | 'default';

interface ConfirmSheetProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  /** A 24px icon for the tile above the title (stop, trash…); none = no tile. */
  icon?: ReactNode;
  /** destructive = the cherry tile + a solid cherry confirm; default = a soft tile + the pink pill. */
  tone?: ConfirmTone;
  confirmLabel: string;
  onConfirm: () => void;
  /** Cancel, the close button, Esc and a scrim tap. */
  onCancel: () => void;
  /** Default: "ביטול". */
  cancelLabel?: string;
  /** A second real choice between confirm and cancel (e.g. "resume the open workout"). */
  secondary?: { label: string; onClick: () => void; tone?: ConfirmTone };
  /** No cancel button (the close button, Esc and the scrim still cancel) — when `secondary` already is the way back. */
  hideCancel?: boolean;
  /** The action is running: a spinner in the confirm, and the sheet can't be dismissed. */
  isWorking?: boolean;
  /** Extra fields between the message and the buttons (the coach's message + tip). */
  children?: ReactNode;
}

/**
 * THE "are you sure?" of the app: a bottom sheet (BottomSheet: 300 / 200 ms, drag, focus trap) with an
 * optional icon tile, the title, the message and stacked full-width pills. The focus starts on cancel.
 */
export function ConfirmSheet({
  isOpen,
  title,
  message,
  icon,
  tone = 'default',
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel,
  secondary,
  hideCancel = false,
  isWorking = false,
  children,
}: ConfirmSheetProps) {
  const shared = useCopy(sharedCopy);
  const titleId = useId();
  const cancel = isWorking ? () => undefined : onCancel;

  return (
    <BottomSheet isOpen={isOpen} onClose={cancel} labelledBy={titleId} className="confirm-sheet">
      <button type="button" className="confirm-sheet-close" aria-label={shared.common.close} onClick={cancel} disabled={isWorking}>
        <IconX size={18} stroke={2.2} aria-hidden="true" />
      </button>
      {icon && (
        <span className={`confirm-sheet-icon confirm-sheet-icon-${tone}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="confirm-sheet-title display-title" id={titleId}>
        {title}
      </h2>
      {message && <p className="confirm-sheet-message">{message}</p>}
      {children}
      <div className="confirm-sheet-actions">
        <button
          type="button"
          className={`confirm-sheet-button confirm-sheet-confirm-${tone}`}
          onClick={onConfirm}
          disabled={isWorking}
          aria-busy={isWorking || undefined}
        >
          {isWorking ? <Spinner size="sm" /> : confirmLabel}
        </button>
        {secondary && (
          <button
            type="button"
            className={`confirm-sheet-button confirm-sheet-soft${secondary.tone === 'destructive' ? ' confirm-sheet-soft-destructive' : ''}`}
            onClick={secondary.onClick}
            disabled={isWorking}
          >
            {secondary.label}
          </button>
        )}
        {!hideCancel && (
          <button type="button" className="confirm-sheet-button confirm-sheet-soft" onClick={cancel} disabled={isWorking} data-autofocus>
            {cancelLabel ?? shared.common.cancel}
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
