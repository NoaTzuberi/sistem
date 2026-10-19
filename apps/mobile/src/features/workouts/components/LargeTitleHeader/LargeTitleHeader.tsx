import type { ReactNode } from 'react';
import './LargeTitleHeader.css';

interface LargeTitleHeaderProps {
  title: string;
  /** A control at the end of the title row (the "+ free workout" pill). */
  action?: ReactNode;
  /** Under the title (the segmented tabs). */
  children?: ReactNode;
}

/** A native-style large title, sticky on frosted white under the status bar. */
export function LargeTitleHeader({ title, action, children }: LargeTitleHeaderProps) {
  return (
    <header className="large-title-header">
      <div className="large-title-row">
        <h1 className="large-title display-title">{title}</h1>
        {action}
      </div>
      {children}
    </header>
  );
}
