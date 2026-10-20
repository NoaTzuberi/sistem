import './CardioSwitch.css';

interface CardioSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

/** An on / off row: a real checkbox drawn as a switch (Cherry Rose when on). */
export function CardioSwitch({ checked, onChange, label, hint }: CardioSwitchProps) {
  return (
    <label className="cp-switch">
      <span className="cp-switch-text">
        {label}
        {hint && <small className="cp-switch-hint">{hint}</small>}
      </span>
      <input className="cp-switch-input" type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="cp-switch-track" aria-hidden="true" />
    </label>
  );
}
