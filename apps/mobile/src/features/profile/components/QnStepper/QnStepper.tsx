import { IconMinus, IconPlus } from '@tabler/icons-react';
import { parseDecimalInput } from '@sistem/shared';
import { roundToStep } from '../../data/profileDisplay';
import './QnStepper.css';

interface QnStepperProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min: number;
  max: number;
  unit?: string;
  upLabel: string;
  downLabel: string;
  /** Days: a whole number shown, not typed. Body values: typed too. */
  editable?: boolean;
}

/** − value + for a number answer (days, weight, height). The value stays a string, as in onboarding. */
export function QnStepper({ label, value, onChange, step, min, max, unit, upLabel, downLabel, editable = false }: QnStepperProps) {
  const current = parseDecimalInput(value);
  const move = (direction: 1 | -1) => {
    const base = current ?? min;
    const next = roundToStep(base + direction * step, step);
    if (next >= min && next <= max) onChange(String(next));
  };
  return (
    <div className="qn-stepper" role="group" aria-label={label}>
      <span className="qn-stepper-label">{label}</span>
      <div className="qn-stepper-control">
        <button type="button" className="qn-stepper-button" aria-label={downLabel} disabled={current !== null && current - step < min} onClick={() => move(-1)}>
          <IconMinus size={18} aria-hidden="true" />
        </button>
        <span className="qn-stepper-value">
          {editable ? (
            <input
              className="qn-stepper-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              dir="ltr"
              aria-label={label}
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          ) : (
            <output className="qn-stepper-number" aria-live="polite">
              {value}
            </output>
          )}
          {unit && (
            <span className="qn-stepper-unit" aria-hidden="true">
              {unit}
            </span>
          )}
        </span>
        <button type="button" className="qn-stepper-button" aria-label={upLabel} disabled={current !== null && current + step > max} onClick={() => move(1)}>
          <IconPlus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
