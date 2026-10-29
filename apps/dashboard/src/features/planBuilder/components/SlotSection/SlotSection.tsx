import type { ReactNode } from 'react';
import { fill, useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { planBuilderCopy } from '../../copy';
import './SlotSection.css';

interface SlotSectionProps {
  name: string;
  /**
   * A template slot: "+ Add" / "Choose exercise", and × to remove it while it is empty. Left out
   * for the two plain groups: a free workout's exercises, and "Other" (exercises of a typed
   * workout that fit none of its slots).
   */
  slot?: { onAdd: () => void; onRemove: () => void };
  /** How many exercises it holds now. */
  count: number;
  /** The exercise cards (and the AI's suggestions for an empty slot). */
  children: ReactNode;
}

/**
 * One group of a workout. A template slot is a suggestion (owner, 2026-10-28): none is required
 * and it takes any number of exercises. Empty, it is a soft placeholder — "Suggestion: <muscle>",
 * "Choose exercise" and × to remove it; with exercises, its name and "+ Add".
 */
export function SlotSection({ name, slot, count, children }: SlotSectionProps) {
  const copy = useCopy(planBuilderCopy);

  if (slot && count === 0) {
    return (
      <section className="slot-section slot-section-suggestion" aria-label={fill(copy.slotSuggestion, { slot: name })}>
        <div className="slot-suggestion">
          <p className="slot-suggestion-text">{fill(copy.slotSuggestion, { slot: name })}</p>
          <button className="slot-add" type="button" aria-label={fill(copy.addToSlotNamed, { slot: name })} onClick={slot.onAdd}>
            {copy.chooseExercise}
          </button>
          <button className="slot-remove" type="button" aria-label={fill(copy.removeSuggestion, { slot: name })} title={fill(copy.removeSuggestion, { slot: name })} onClick={slot.onRemove}>
            <Icon name="close" className="slot-remove-icon" />
          </button>
        </div>
        <ul className="slot-list">{children}</ul>
      </section>
    );
  }

  return (
    <section className="slot-section" aria-label={name}>
      <header className="slot-header">
        <h3 className="slot-name">{name}</h3>
        {slot && (
          <button className="slot-add" type="button" aria-label={fill(copy.addToSlotNamed, { slot: name })} onClick={slot.onAdd}>
            {copy.addToSlot}
          </button>
        )}
      </header>
      <ul className="slot-list">{children}</ul>
      {count === 0 && <p className="slot-empty">{copy.emptyWorkout}</p>}
    </section>
  );
}
