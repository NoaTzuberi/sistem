import { useCallback, useState } from 'react';

interface EndCoachingState {
  /** The confirm sheet is open. */
  isConfirming: boolean;
  isEnding: boolean;
  /** The sheet's error line after a failed call (the copy's text, not the server's). */
  error: string | null;
  ask: () => void;
  cancel: () => void;
  confirm: () => Promise<void>;
}

/**
 * The "End coaching" flow both coach apps share: ⋯ menu → confirm sheet → the call → `onEnded` (each app
 * navigates to its list). `end` is the app's own service call; the server decides everything else.
 */
export function useEndCoaching(end: () => Promise<unknown>, onEnded: () => void, errorText: string): EndCoachingState {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(() => {
    setError(null);
    setIsConfirming(true);
  }, []);

  const cancel = useCallback(() => {
    if (!isEnding) setIsConfirming(false);
  }, [isEnding]);

  const confirm = useCallback(async () => {
    setIsEnding(true);
    setError(null);
    try {
      await end();
      setIsConfirming(false);
      onEnded();
    } catch {
      setError(errorText);
    } finally {
      setIsEnding(false);
    }
  }, [end, onEnded, errorText]);

  return { isConfirming, isEnding, error, ask, cancel, confirm };
}
