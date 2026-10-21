import { fill, useCopy } from '@sistem/shared';
import { workoutCopy } from '../../copy';
import './FeelPicker.css';

const VALUES = [1, 2, 3, 4, 5] as const;

interface FeelPickerProps {
  value: number | null;
  labelledBy: string;
  onChange: (value: number | null) => void;
}

/**
 * "How was it?" 1–5, each chip in its intensity zone's colors (1 Z1 … 5 Z5): easy, just right, very
 * hard. The chosen one is solid and lifted; tapping it again clears it.
 */
export function FeelPicker({ value, labelledBy, onChange }: FeelPickerProps) {
  const copy = useCopy(workoutCopy);
  const words: Record<number, string> = { 1: copy.finish.feelEasy, 3: copy.finish.feelRight, 5: copy.finish.feelHard };

  return (
    <div className="ws-feel" role="radiogroup" aria-labelledby={labelledBy}>
      {VALUES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          data-zone={option}
          aria-checked={value === option}
          aria-label={words[option] ? `${fill(copy.summary.ratingOption, { value: option })}, ${words[option]}` : fill(copy.summary.ratingOption, { value: option })}
          className="ws-feel-chip"
          onClick={() => onChange(value === option ? null : option)}
        >
          <b>{option}</b>
          <small aria-hidden="true">{words[option] ?? ' '}</small>
        </button>
      ))}
    </div>
  );
}
