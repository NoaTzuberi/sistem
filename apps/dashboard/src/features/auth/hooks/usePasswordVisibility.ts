import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type PasswordVisibility = ReturnType<typeof usePasswordVisibility>;

/**
 * One password field's show / hide state. Each field calls it once (each has its own toggle); the
 * page calls `hide()` after a successful submit. Leaving the screen unmounts it = hidden again.
 */
export function usePasswordVisibility() {
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Switching the input's type moves the caret to the end in some browsers: put it back.
  const caret = useRef<{ start: number | null; end: number | null } | null>(null);

  const toggle = useCallback(() => {
    const input = inputRef.current;
    caret.current = input && document.activeElement === input ? { start: input.selectionStart, end: input.selectionEnd } : null;
    setIsVisible((visible) => !visible);
  }, []);

  const hide = useCallback(() => setIsVisible(false), []);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const saved = caret.current;
    caret.current = null;
    if (input && saved && saved.start !== null && saved.end !== null) input.setSelectionRange(saved.start, saved.end);
  }, [isVisible]);

  return { isVisible, toggle, hide, inputRef };
}
