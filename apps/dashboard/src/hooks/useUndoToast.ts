import { useCallback, useEffect, useRef, useState } from 'react';

/** Long enough to read the line and reach "Undo"; the plain toast stays 2.2s. */
const UNDO_MS = 5000;

interface UndoOffer {
  /** What happened ("Oats removed"). */
  message: string;
  /** Puts it back. */
  onUndo: () => void;
  /** Runs once the undo is no longer offered (a delete that waits for it: the server call). */
  onCommit?: () => void;
}

/**
 * A destructive action with "Undo" instead of a confirm dialog: the item goes away at once and the toast
 * offers it back for a few seconds. A delete that needs the server passes onCommit, called when the toast
 * expires, when another undo replaces it, or when the page closes — never lost, never run twice.
 */
export function useUndoToast() {
  const [message, setMessage] = useState<string>();
  const current = useRef<UndoOffer | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    const offer = current.current;
    current.current = null;
    setMessage(undefined);
    offer?.onCommit?.();
  }, []);

  const offer = useCallback(
    (next: UndoOffer) => {
      commit();
      current.current = next;
      setMessage(next.message);
      timer.current = window.setTimeout(commit, UNDO_MS);
    },
    [commit],
  );

  const undo = useCallback(() => {
    window.clearTimeout(timer.current);
    const offerNow = current.current;
    current.current = null;
    setMessage(undefined);
    offerNow?.onUndo();
  }, []);

  // Leaving the page or closing the tab finishes what is waiting.
  useEffect(() => {
    window.addEventListener('pagehide', commit);
    return () => {
      window.removeEventListener('pagehide', commit);
      commit();
    };
  }, [commit]);

  return { undoMessage: message, offerUndo: offer, undo };
}
