import './Stepper.css';

interface StepperProps {
  /** What it counts, read aloud (the group's name). */
  label: string;
  value: number;
  min: number;
  max: number;
  /** The value as text ("4 שבועות"). */
  valueText: string;
  lessLabel: string;
  moreLabel: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** − value + : a small whole-number control (a plan's number of weeks). */
export function Stepper({ label, value, min, max, valueText, lessLabel, moreLabel, onChange, disabled }: StepperProps) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button className="stepper-button" type="button" aria-label={lessLabel} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output className="stepper-value" aria-live="polite">
        {valueText}
      </output>
      <button className="stepper-button" type="button" aria-label={moreLabel} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
