import type { KeyboardEvent } from 'react';
import { directionOf, useLanguage } from '@sistem/shared';
import './CardioSegmented.css';

interface CardioSegmentedProps<T extends string> {
  label: string;
  /** The id of the visible label above it. */
  labelledBy: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of pills that behaves as a radio group: one tab stop, arrows move in reading order and select. */
export function CardioSegmented<T extends string>({ label, labelledBy, options, value, onChange }: CardioSegmentedProps<T>) {
  const isRtl = directionOf(useLanguage()) === 'rtl';

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((option) => option.id === value);
    let next: number;
    if (event.key === 'ArrowRight') next = index + (isRtl ? -1 : 1);
    else if (event.key === 'ArrowLeft') next = index + (isRtl ? 1 : -1);
    else if (event.key === 'ArrowDown') next = index + 1;
    else if (event.key === 'ArrowUp') next = index - 1;
    else return;
    event.preventDefault();
    const option = options[(next + options.length) % options.length];
    onChange(option.id);
    event.currentTarget.querySelector<HTMLElement>(`[data-id="${option.id}"]`)?.focus();
  }

  return (
    <div className="cb-seg" role="radiogroup" aria-label={label} aria-labelledby={labelledBy} onKeyDown={handleKeyDown}>
      {options.map((option) => (
        <button
          key={option.id}
          className="cb-seg-option"
          type="button"
          role="radio"
          data-id={option.id}
          aria-checked={option.id === value}
          tabIndex={option.id === value ? 0 : -1}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
