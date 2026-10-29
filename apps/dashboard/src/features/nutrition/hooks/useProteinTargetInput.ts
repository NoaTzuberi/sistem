import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';

/** = the server's MAX_PROTEIN_GRAMS_TARGET. */
export const PROTEIN_TARGET_MAX = 400;

/**
 * The daily protein goal field: whole grams only. Empty = no goal (null); 1–400 goes to the draft
 * (which autosaves); anything else stays in the field with an error and is not sent.
 */
export function useProteinTargetInput(value: number | null, onChange: (value: number | null) => void) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const [isInvalid, setIsInvalid] = useState(false);

  // A reload, a template or undo changes the draft: the field follows when it isn't mid-edit.
  useEffect(() => {
    setText((current) => {
      const shown = current === '' ? null : Number(current);
      if (shown === value) return current;
      setIsInvalid(false);
      return value === null ? '' : String(value);
    });
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.replace(/\D/g, '').slice(0, 3);
    setText(next);
    if (next === '') {
      setIsInvalid(false);
      onChange(null);
      return;
    }
    const grams = Number(next);
    const valid = grams >= 1 && grams <= PROTEIN_TARGET_MAX;
    setIsInvalid(!valid);
    if (valid) onChange(grams);
  }

  return { text, isInvalid, onChange: handleChange };
}
