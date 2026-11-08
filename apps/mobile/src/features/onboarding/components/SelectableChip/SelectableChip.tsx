import type { ButtonHTMLAttributes } from 'react';
import './SelectableChip.css';

interface SelectableChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  emoji?: string;
  selected: boolean;
}

export function SelectableChip({ label, emoji, selected, className, ...rest }: SelectableChipProps) {
  const classNames = ['selectable-chip', selected ? 'selectable-chip-selected' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classNames} aria-pressed={selected} {...rest}>
      {emoji && <span className="selectable-chip-emoji">{emoji}</span>}
      {/* data-label: a hidden bold copy keeps the width when the selected label turns bold. */}
      <span className="selectable-chip-label" data-label={label}>
        {label}
      </span>
    </button>
  );
}
