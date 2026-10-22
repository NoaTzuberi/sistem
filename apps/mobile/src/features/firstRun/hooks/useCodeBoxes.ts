import { useCallback, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { CODE_LENGTH, cleanCodeChars, emptyBoxes, fillBoxes, readPastedCode } from '../data/coachCode';

/**
 * The 6 code boxes: typing moves on, Backspace on an empty box goes back, pasting a code (or a link
 * with a short code) fills every box. A link with a long code skips the boxes: `onLinkCode` gets it.
 */
export function useCodeBoxes(onLinkCode: (code: string) => void, onEdit: () => void) {
  const [boxes, setBoxes] = useState<string[]>(emptyBoxes);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = useCallback((index: number) => {
    refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))]?.focus();
  }, []);

  /** True when the text held a code (or a link). */
  const applyText = useCallback(
    (text: string, start = 0): boolean => {
      const pasted = readPastedCode(text);
      if (pasted.kind === 'none') return false;
      onEdit();
      if (pasted.kind === 'link') {
        onLinkCode(pasted.code);
        return true;
      }
      setBoxes((current) => fillBoxes(start === 0 ? emptyBoxes() : current, start, pasted.chars));
      focusBox(start + pasted.chars.length);
      return true;
    },
    [focusBox, onEdit, onLinkCode],
  );

  function handleChange(index: number, value: string) {
    const chars = cleanCodeChars(value);
    // The keyboard's one-time-code autofill (or a long press paste) types several at once.
    if (chars.length > 2) {
      applyText(chars, 0);
      return;
    }
    // A box that had a character keeps only the new one.
    const char = chars.length === 0 ? '' : chars[chars.length - 1];
    onEdit();
    setBoxes((current) => current.map((box, at) => (at === index ? char : box)));
    if (char && index < CODE_LENGTH - 1) focusBox(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && boxes[index] === '' && index > 0) {
      event.preventDefault();
      onEdit();
      setBoxes((current) => current.map((box, at) => (at === index - 1 ? '' : box)));
      focusBox(index - 1);
    } else if (event.key === 'ArrowLeft') {
      // The boxes are always left to right (a code is Latin), in both languages.
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    applyText(event.clipboardData.getData('text'), 0);
  }

  const code = boxes.join('');
  return {
    boxes,
    code,
    isComplete: code.length === CODE_LENGTH,
    refs,
    focusBox,
    applyText,
    handleChange,
    handleKeyDown,
    handlePaste,
  };
}
