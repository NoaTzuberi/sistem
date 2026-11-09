import { useId } from 'react';
import { useCopy, useI18n } from '@sistem/shared';
import { coachCopy } from '../../copy';
import './PlanLengthChoice.css';

export type PlanLength = 'weekly' | 'block';

export const MIN_BLOCK_WEEKS = 2;
export const MAX_BLOCK_WEEKS = 8;
export const DEFAULT_BLOCK_WEEKS = 4;

interface PlanLengthChoiceProps {
  length: PlanLength;
  weeks: number;
  onLengthChange: (length: PlanLength) => void;
  onWeeksChange: (weeks: number) => void;
  disabled?: boolean;
}

/** The first choice of "תוכנית חדשה" in coach mode: weekly, or a multi-week plan of 2–8 weeks. */
export function PlanLengthChoice({ length, weeks, onLengthChange, onWeeksChange, disabled }: PlanLengthChoiceProps) {
  const copy = useCopy(coachCopy).length;
  const { plural } = useI18n();
  const labelId = useId();
  const options: { value: PlanLength; label: string }[] = [
    { value: 'weekly', label: copy.weekly },
    { value: 'block', label: copy.block },
  ];
  return (
    <div className="plan-length-choice">
      <span className="plan-length-choice-label" id={labelId}>
        {copy.label}
      </span>
      <div className="plan-length-choice-segments" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            className="plan-length-choice-segment"
            aria-checked={option.value === length}
            disabled={disabled}
            onClick={() => onLengthChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {length === 'block' && (
        <div className="plan-length-choice-stepper" role="group" aria-label={copy.label}>
          <button type="button" className="plan-length-choice-step" aria-label={copy.fewer} disabled={disabled || weeks <= MIN_BLOCK_WEEKS} onClick={() => onWeeksChange(weeks - 1)}>
            −
          </button>
          <output className="plan-length-choice-weeks" aria-live="polite">
            {plural(copy.weeks, weeks)}
          </output>
          <button type="button" className="plan-length-choice-step" aria-label={copy.more} disabled={disabled || weeks >= MAX_BLOCK_WEEKS} onClick={() => onWeeksChange(weeks + 1)}>
            +
          </button>
        </div>
      )}
    </div>
  );
}
