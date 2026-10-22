import type { ReactNode } from 'react';
import './OptionRow.css';

interface OptionRowProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}

/** A white option row under the code ("Paste link"): an icon tile, a label, a muted hint. */
export function OptionRow({ icon, label, hint, onClick }: OptionRowProps) {
  return (
    <button type="button" className="fr-option" onClick={onClick}>
      <span className="fr-option-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="fr-option-text">
        {label}
        {hint && <small className="fr-option-hint">{hint}</small>}
      </span>
    </button>
  );
}
