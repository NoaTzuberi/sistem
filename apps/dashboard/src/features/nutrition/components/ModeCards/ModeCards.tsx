import type { KeyboardEvent } from 'react';
import type { NutritionPlanMode } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import type { IconName } from '../../../../components/common/Icon/iconPaths';
import { nutritionCopy } from '../../copy';
import './ModeCards.css';

interface ModeCardsProps {
  mode: NutritionPlanMode;
  onChange: (mode: NutritionPlanMode) => void;
}

const MODES: { id: NutritionPlanMode; icon: IconName }[] = [
  { id: 'portions', icon: 'foods' },
  { id: 'menu', icon: 'utensils' },
];

/**
 * What she gets: daily portions only, or a full menu (owner, 2026-10-20). A radio group of two cards —
 * arrow keys move the choice, as native radios do. Switching never deletes the meals or the portions.
 */
export function ModeCards({ mode, onChange }: ModeCardsProps) {
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const text: Record<NutritionPlanMode, { title: string; body: string }> = {
    portions: { title: b.modePortions, body: b.modePortionsText },
    menu: { title: b.modeMenu, body: b.modeMenuText },
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const next = mode === 'portions' ? 'menu' : 'portions';
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)?.focus();
  }

  return (
    <div className="nm-cards" role="radiogroup" aria-label={b.step2} onKeyDown={handleKeyDown}>
      {MODES.map(({ id, icon }) => {
        const selected = id === mode;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-mode={id}
            className={selected ? 'nm-card nm-card-selected' : 'nm-card'}
            onClick={() => onChange(id)}
          >
            <span className="nm-card-icon" aria-hidden="true">
              <Icon name={icon} />
            </span>
            <span className="nm-card-text">
              <b className="nm-card-title">{text[id].title}</b>
              <span className="nm-card-body">{text[id].body}</span>
            </span>
            <span className="nm-card-dot" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
