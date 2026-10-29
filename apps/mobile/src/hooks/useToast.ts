import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastAction } from '../components/common/Toast/Toast';

const TOAST_MS = 2200;
/** A toast with a button stays long enough to reach it. */
const ACTION_TOAST_MS = 5000;

/** One toast at a time: a new message replaces the one on screen and restarts the clock. */
export function useToast() {
  const [message, setMessage] = useState<string>();
  const [action, setAction] = useState<ToastAction>();
  const timer = useRef<number | undefined>(undefined);

  const hideToast = useCallback(() => {
    window.clearTimeout(timer.current);
    setMessage(undefined);
    setAction(undefined);
  }, []);

  const showToast = useCallback(
    (text: string, withAction?: ToastAction) => {
      window.clearTimeout(timer.current);
      setMessage(text);
      setAction(withAction);
      timer.current = window.setTimeout(hideToast, withAction ? ACTION_TOAST_MS : TOAST_MS);
    },
    [hideToast],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { toastMessage: message, toastAction: action, showToast, hideToast };
}
