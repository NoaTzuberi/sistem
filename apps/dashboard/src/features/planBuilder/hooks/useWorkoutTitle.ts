import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

/** A workout's name in the builder: at most this many characters (the server checks the same). */
export const WORKOUT_TITLE_MAX = 40;

interface WorkoutTitleOptions {
  title: string;
  /** "Workout 2": what an emptied name falls back to. */
  defaultTitle: string;
  /** A new workout: focus and select the name so she renames it right away. */
  autoFocus?: boolean;
  onCommit: (title: string) => void;
}

/**
 * The inline name field: edits stay local and are saved on blur or Enter (trimmed; empty = the
 * default name); Esc puts back the name it had and leaves the field.
 */
export function useWorkoutTitle({ title, defaultTitle, autoFocus, onCommit }: WorkoutTitleOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(title);
  const cancelled = useRef(false);

  // Another change of the workout (undo, AI draft, reload) wins over a field that isn't being edited.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setValue(title);
  }, [title]);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [autoFocus]);

  function commit() {
    const next = value.trim().slice(0, WORKOUT_TITLE_MAX) || defaultTitle;
    setValue(next);
    if (next !== title) onCommit(next);
  }

  return {
    inputRef,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    onBlur: () => {
      if (cancelled.current) {
        cancelled.current = false;
        setValue(title);
        return;
      }
      commit();
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelled.current = true;
        event.currentTarget.blur();
      }
    },
  };
}
