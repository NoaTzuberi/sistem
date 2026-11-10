import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../../hooks/useDialogFocus';
import { useDrawerTransition } from '../../../hooks/useDrawerTransition';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/iconPaths';
import { PillButton } from '../PillButton/PillButton';
import type { PillButtonVariant } from '../PillButton/PillButton';
import './ConfirmDialog.css';

// = --transition-drawer-out: the dialog leaves the page once its fade-out is over.
const CLOSE_MS = 200;

/** One answer of a 3+ option question: a card with an icon, a bold label and a one-line description. */
export interface ConfirmChoice {
  label: string;
  description: string;
  icon: IconName;
  /** 'danger' = it overwrites something (cherry label, icon and border). */
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

interface BaseProps {
  isOpen: boolean;
  title: string;
  text: string;
  cancelLabel: string;
  onCancel: () => void;
  /** The header's icon tile (soft pink). */
  icon?: IconName;
  /** The action is running: every button waits. */
  busy?: boolean;
  /** A failed action's line, shown above the buttons. */
  error?: string | null;
}

/** Two answers: the confirm pill over a soft Cancel pill; the focus starts on Cancel. */
interface TwoOptionProps extends BaseProps {
  confirmLabel: string;
  onConfirm: () => void;
  /** The confirm button's look (default primary pink). */
  confirmVariant?: PillButtonVariant;
  choices?: undefined;
}

/** Three or more answers: stacked choice cards (the first = the safe default, focused) and a small Cancel. */
interface ChoicesProps extends BaseProps {
  choices: ConfirmChoice[];
}

type ConfirmDialogProps = TwoOptionProps | ChoicesProps;

/** A small centered question (instead of window.confirm): Esc and the scrim cancel, Tab stays inside. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const { isOpen, title, text, cancelLabel, onCancel, icon, busy = false, error = null } = props;
  const { isMounted, isShown } = useDrawerTransition(isOpen, CLOSE_MS);
  const cardRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
  const keepFocusInside = useDialogFocus(isOpen, isMounted, onCancel, cardRef, initialFocusRef);

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
        {icon && (
          <span className="confirm-dialog-icon" aria-hidden="true">
            <Icon name={icon} />
          </span>
        )}
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
        {props.choices ? (
          <>
            <div className="confirm-dialog-choices">
              {props.choices.map((choice, index) => (
                <button
                  key={choice.label}
                  ref={index === 0 ? initialFocusRef : undefined}
                  className={choice.tone === 'danger' ? 'confirm-choice confirm-choice-danger' : 'confirm-choice'}
                  type="button"
                  disabled={busy}
                  aria-busy={busy || undefined}
                  onClick={choice.onSelect}
                >
                  <span className="confirm-choice-icon" aria-hidden="true">
                    <Icon name={choice.icon} />
                  </span>
                  <span className="confirm-choice-text">
                    <span className="confirm-choice-label">{choice.label}</span>
                    <span className="confirm-choice-description">{choice.description}</span>
                  </span>
                </button>
              ))}
            </div>
            <button className="confirm-dialog-cancel" type="button" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
          </>
        ) : (
          <div className="confirm-dialog-actions">
            <PillButton variant={props.confirmVariant ?? 'primary'} onClick={props.onConfirm} disabled={busy} aria-busy={busy || undefined}>
              {props.confirmLabel}
            </PillButton>
            <PillButton ref={initialFocusRef} variant="soft" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </PillButton>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
