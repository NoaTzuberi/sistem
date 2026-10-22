import { useCopy } from '@sistem/shared';
import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { workoutCopy } from '../../copy';
import './PlayerStepper.css';

interface PlayerStepperProps {
  value: number | undefined;
  step: number;
  max: number;
  /** Decimals allowed (weights); otherwise whole numbers (reps, seconds). */
  decimal?: boolean;
  /** Accessible name, e.g. "kg, set 2". */
  label: string;
  /** Shown when there is no value ("BW" on a bodyweight set, else "–"). */
  placeholder: string;
  /** A done set: the value stays, the − / + step away and it can't be typed over. */
  locked?: boolean;
  onChange: (value: number | undefined) => void;
}

/** Up to two decimals, without trailing zeros: 42.5, 43, 12.25. */
function format(value: number | undefined): string {
  return value === undefined ? '' : String(Math.round(value * 100) / 100);
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(value * 100) / 100));
}

/**
 * −  value  + in a 48px pill: round 36px buttons for one hand at the gym, and the number itself
 * opens the numeric keypad. Empty = no value (a bodyweight set); stepping down to 0 clears it.
 */
export function PlayerStepper({ value, step, max, decimal = false, label, placeholder, locked = false, onChange }: PlayerStepperProps) {
  const copy = useCopy(workoutCopy);
  const [draft, setDraft] = useState(format(value));

  useEffect(() => {
    setDraft(format(value));
  }, [value]);

  const pattern = decimal ? /^\d*[.,]?\d*$/ : /^\d*$/;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (pattern.test(next)) setDraft(next);
  }

  function commitDraft() {
    if (draft.trim() === '') {
      if (value !== undefined) onChange(undefined);
      return;
    }
    const parsed = Number(draft.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      setDraft(format(value));
      return;
    }
    const next = clamp(decimal ? parsed : Math.round(parsed), max);
    setDraft(format(next));
    if (next !== value) onChange(next);
  }

  function stepBy(direction: 1 | -1) {
    const next = clamp((value ?? 0) + direction * step, max);
    // A weight stepped down to 0 is "no weight" (bodyweight) again.
    onChange(decimal && next === 0 ? undefined : next);
  }

  return (
    <div className={locked ? 'wp-stepper wp-stepper-locked' : 'wp-stepper'} role="group" aria-label={label}>
      <button
        type="button"
        className="wp-stepper-button"
        aria-label={`${copy.session.decrease} ${label}`}
        disabled={locked || value === undefined || value <= 0}
        tabIndex={locked ? -1 : undefined}
        onClick={() => stepBy(-1)}
      >
        −
      </button>
      <input
        className="wp-stepper-input"
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        enterKeyHint="done"
        placeholder={placeholder}
        value={draft}
        readOnly={locked}
        aria-label={label}
        onChange={handleChange}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        onFocus={(event) => {
          if (!locked) event.currentTarget.select();
        }}
      />
      <button
        type="button"
        className="wp-stepper-button"
        aria-label={`${copy.session.increase} ${label}`}
        disabled={locked || (value !== undefined && value >= max)}
        tabIndex={locked ? -1 : undefined}
        onClick={() => stepBy(1)}
      >
        +
      </button>
    </div>
  );
}
