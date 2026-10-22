import { IconMinus, IconPlus } from '@tabler/icons-react';
import { fill, useCopy } from '@sistem/shared';
import { cardioCopy } from '../../copy';
import './SgStepper.css';

interface SgStepperProps {
  label: string;
  /** The value as shown (Barlow numbers, isolated left to right). */
  display: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
}

/** − value + with 44px targets; the value is announced with its label. */
export function SgStepper({ label, display, onDecrease, onIncrease, canDecrease, canIncrease }: SgStepperProps) {
  const copy = useCopy(cardioCopy).builder;
  return (
    <div className="sg-stepper" role="group" aria-label={label}>
      <span className="sg-stepper-label">{label}</span>
      <div className="sg-stepper-row">
        <button type="button" className="sg-stepper-button" onClick={onDecrease} disabled={!canDecrease} aria-label={fill(copy.decrease, { what: label })}>
          <IconMinus size={16} aria-hidden="true" />
        </button>
        <output className="sg-stepper-value" aria-live="polite" dir="ltr">
          {display}
        </output>
        <button type="button" className="sg-stepper-button" onClick={onIncrease} disabled={!canIncrease} aria-label={fill(copy.increase, { what: label })}>
          <IconPlus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
