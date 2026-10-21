import { createPortal } from 'react-dom';
import './Toast.css';

interface ToastProps {
  /** The line to show; undefined = nothing on screen. */
  message: string | undefined;
  /** "Undo" after a destructive action (useUndoToast). */
  action?: { label: string; onPress: () => void };
}

/**
 * One short confirmation at the bottom of the screen (useToast owns the timing). Portaled to
 * <body>, so no parent's transform or overflow can pin or clip it. The live region is always
 * mounted — a region added together with its text is not read aloud.
 */
export function Toast({ message, action }: ToastProps) {
  return createPortal(
    <div className="toast-region" role="status" aria-live="polite">
      {message !== undefined && (
        // Keyed by the text: a new message enters again instead of swapping in place.
        <p key={message} className={action ? 'toast toast-with-action' : 'toast'}>
          <span dir="auto">{message}</span>
          {action && (
            <button className="toast-action" type="button" onClick={action.onPress}>
              {action.label}
            </button>
          )}
        </p>
      )}
    </div>,
    document.body,
  );
}
