import type { KeyboardEvent } from 'react';
import { useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import type { DraftOption } from '../../nutritionDraft';
import './MealOptionTabs.css';

interface MealOptionTabsProps {
  options: DraftOption[];
  selected: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
}

/** A meal's options as tabs (her names for them; arrows move between them), and "+ option" after the tab list. */
export function MealOptionTabs({ options, selected, onSelect, onAdd }: MealOptionTabsProps) {
  const copy = useCopy(nutritionCopy);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0;
    if (step === 0 || options.length < 2) return;
    event.preventDefault();
    // RTL: left goes forward; in LTR the arrows swap.
    const direction = getComputedStyle(event.currentTarget).direction === 'rtl' ? step : -step;
    const next = (selected + direction + options.length) % options.length;
    onSelect(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div className="nb-option-tabs">
      <div className="nb-option-tablist" role="tablist" aria-label={copy.optionsTitle} onKeyDown={handleKeyDown}>
        {options.map((option, index) => (
          <button
            key={option.key}
            className="nb-option-tab"
            type="button"
            role="tab"
            aria-selected={index === selected}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => onSelect(index)}
          >
            <bdi>{option.label || '—'}</bdi>
          </button>
        ))}
      </div>
      <button className="nb-option-tab nb-option-tab-add" type="button" onClick={onAdd}>
        {copy.addOption}
      </button>
    </div>
  );
}
