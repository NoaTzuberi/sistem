import type { FoodGroup, PortionCounts } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { IconChevronRight } from '@tabler/icons-react';
import { nutritionCopy } from '../../copy';
import { PortionCells } from '../PortionCells/PortionCells';
import { ProteinGoal } from '../ProteinGoal/ProteinGoal';
import './DayTotals.css';

interface DayTotalsProps {
  portions: PortionCounts;
  vegetablesFree: boolean;
  hasVegetableSwaps: boolean;
  onOpenSwaps: (group: FoodGroup) => void;
  /** The coach's daily protein goal in grams, when she set one. */
  proteinGrams?: number | null;
}

/**
 * Coach mode, read-only: the plan's day as the trainee's fuel cells (every planned cell filled), the free
 * vegetables line (opens its swaps when there are any) and the protein goal when she set one.
 */
export function DayTotals({ portions, vegetablesFree, hasVegetableSwaps, onOpenSwaps, proteinGrams }: DayTotalsProps) {
  const copy = useCopy(nutritionCopy);
  const vegetables = (
    <>
      <span className="day-totals-veg-text">
        <span className="day-totals-veg-title">{copy.vegetablesTitle}</span> · {copy.vegetablesLine}
      </span>
      {hasVegetableSwaps && <IconChevronRight className="flip-rtl day-totals-veg-icon" size={18} aria-hidden="true" />}
    </>
  );
  return (
    <section className="day-totals" aria-labelledby="day-totals-title">
      <h2 className="day-totals-title" id="day-totals-title">
        {copy.coachDayTitle}
      </h2>
      <PortionCells planned={portions} />
      {proteinGrams ? <ProteinGoal grams={proteinGrams} /> : null}
      {vegetablesFree &&
        (hasVegetableSwaps ? (
          <button type="button" className="day-totals-veg day-totals-veg-button" onClick={() => onOpenSwaps('vegetable')}>
            {vegetables}
          </button>
        ) : (
          <p className="day-totals-veg">{vegetables}</p>
        ))}
    </section>
  );
}
