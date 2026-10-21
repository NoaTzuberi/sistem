import { createPortal } from 'react-dom';
import './Toast.css';

interface ToastProps {
  /** The line to show; undefined = nothing on screen. */
  message: string | undefined;
}

/**
 * One short confirmation above the dock (useToast owns the timing) — the dashboard's Toast. Portaled
 * to <body>, so the page-enter transform on <main> can't pin it. The live region is always mounted —
 * a region added together with its text is not read aloud.
 */
export function Toast({ message }: ToastProps) {
  return createPortal(
    <div className="toast-region" role="status" aria-live="polite">
      {message !== undefined && (
        // Keyed by the text: a new message enters again instead of swapping in place.
        <p key={message} className="toast" dir="auto">
          {message}
        </p>
      )}
    </div>,
    document.body,
  );
}
