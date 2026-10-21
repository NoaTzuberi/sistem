import type { PortionGroup } from '@sistem/types';
import { fill, formatPortionCountLtr, useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { nutritionCopy } from '../../copy';
import './PortionStepper.css';

const STEP = 0.5;

interface PortionStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** The group's color (a meal's portions); none = a neutral pill (a line inside an option). */
  group?: PortionGroup;
  /** 0 for a meal's group; 0.5 for a line (a line always counts something). */
  min?: number;
  max?: number;
}

/** Portions in steps of ½ (PRD §5.6), as a pill in the group's color — outlined and muted at 0. */
export function PortionStepper({ label, value, onChange, group, min = 0, max = 10 }: PortionStepperProps) {
  const copy = useCopy(nutritionCopy);
  return (
    <div className="nb-stepper" role="group" aria-label={label} data-group={group} data-variant={group ? 'portion' : 'item'} data-zero={value === 0 || undefined}>
      <span className="nb-stepper-label">{label}</span>
      <button
        type="button"
        className="nb-stepper-button"
        onClick={() => onChange(Math.max(min, value - STEP))}
        disabled={value <= min}
        aria-label={fill(copy.builder.removeLess, { group: label })}
      >
        <Icon name="minus" size="sm" />
      </button>
      <span className="nb-stepper-value" aria-live="polite">
        {formatPortionCountLtr(value)}
      </span>
      <button
        type="button"
        className="nb-stepper-button"
        onClick={() => onChange(Math.min(max, value + STEP))}
        disabled={value >= max}
        aria-label={fill(copy.builder.addMore, { group: label })}
      >
        <Icon name="plus" size="sm" />
      </button>
    </div>
  );
}
