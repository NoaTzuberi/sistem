import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import './SegmentedControl.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** The option's own language, when it differs from the page. */
  lang?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Full width; otherwise it hugs its options (a row's control). */
  block?: boolean;
}

/**
 * A soft track with a white thumb that slides (spring) under the chosen option — never a filled block.
 * A radio group: one tab stop, the arrow keys move the choice the way they point (RTL aware).
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange, disabled, block = false }: SegmentedControlProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((option) => option.value === value));

  function choose(next: number) {
    const option = options[(next + options.length) % options.length];
    if (option.value !== value) onChange(option.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[options.indexOf(option)]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forwardKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backKey = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forwardKey || event.key === 'ArrowDown') choose(index + 1);
    else if (event.key === backKey || event.key === 'ArrowUp') choose(index - 1);
    else if (event.key === 'Home') choose(0);
    else if (event.key === 'End') choose(options.length - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div
      ref={groupRef}
      className={'seg-control' + (block ? ' seg-control-block' : '')}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      style={{ '--seg-count': options.length, '--seg-index': index } as CSSProperties}
    >
      <span className="seg-control-thumb" aria-hidden="true" />
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            lang={option.lang}
            className="seg-control-option"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => !checked && onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
