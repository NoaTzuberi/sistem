import type { ReactNode } from 'react';
import { Icon } from '../../../../components/common/Icon/Icon';
import './CardioStepper.css';

interface CardioStepperProps {
  value: ReactNode;
  /** The small line under the value ("דקות", "מאמץ"). */
  unit?: string;
  lessLabel: string;
  moreLabel: string;
  onLess: () => void;
  onMore: () => void;
  /** zone = tinted in the block's zone (on a cb-zone parent) · repeat = on the soft repeat box. */
  tone?: 'plain' | 'zone' | 'repeat';
}

/** − value + : two labelled buttons around an output. */
export function CardioStepper({ value, unit, lessLabel, moreLabel, onLess, onMore, tone = 'plain' }: CardioStepperProps) {
  return (
    <div className={`cb-stepper cb-stepper-${tone}`}>
      <button className="cb-stepper-button" type="button" aria-label={lessLabel} onClick={onLess}>
        <Icon name="minus" size="sm" />
      </button>
      <output className="cb-stepper-value">
        <bdi dir="ltr">{value}</bdi>
        {unit && <small className="cb-stepper-unit">{unit}</small>}
      </output>
      <button className="cb-stepper-button" type="button" aria-label={moreLabel} onClick={onMore}>
        <Icon name="plus" size="sm" />
      </button>
    </div>
  );
}
