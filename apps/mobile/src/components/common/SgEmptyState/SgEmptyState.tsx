import type { ReactNode } from 'react';
import './SgEmptyState.css';

interface SgEmptyStateProps {
  icon: ReactNode;
  title: string;
  text: string;
  /** The ONE primary action. */
  actionLabel: string;
  onAction: () => void;
  actionIcon?: ReactNode;
  disabled?: boolean;
}

/** A self-guided empty state (direction B): a white card, an ink icon tile, a Karantina title, one pink action. */
export function SgEmptyState({ icon, title, text, actionLabel, onAction, actionIcon, disabled }: SgEmptyStateProps) {
  return (
    <section className="sg-empty">
      <span className="sg-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="sg-empty-title">{title}</h2>
      <p className="sg-empty-text">{text}</p>
      <button type="button" className="sg-empty-action" onClick={onAction} disabled={disabled}>
        {actionIcon}
        {actionLabel}
      </button>
    </section>
  );
}
