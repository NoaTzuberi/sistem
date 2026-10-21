import { useCallback, useEffect, useRef, useState } from 'react';

const TOAST_MS = 2200;

/** One toast at a time: a new message replaces the one on screen and restarts the clock. */
export function useToast() {
  const [message, setMessage] = useState<string>();
  const timer = useRef<number | undefined>(undefined);

  const showToast = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    timer.current = window.setTimeout(() => setMessage(undefined), TOAST_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { toastMessage: message, showToast };
}
