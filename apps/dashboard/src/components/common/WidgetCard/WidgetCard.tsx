import type { ReactNode } from 'react';
import './WidgetCard.css';

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  /** Sits at the end of the header (a round "open" arrow). */
  action?: ReactNode;
  /** bare = no white panel: the header sits on the canvas above its own cards. */
  variant?: 'panel' | 'bare';
  className?: string;
  /** Marks the card for the dashboard tour (data-tour). */
  tourId?: string;
  /** None = a header-only card (title, subtitle, action). */
  children?: ReactNode;
}

/** A white rounded widget on the canvas: a small header, then the content. */
export function WidgetCard({ title, subtitle, action, variant = 'panel', className, tourId, children }: WidgetCardProps) {
  const classNames = ['widget-card', `widget-card-${variant}`, className].filter(Boolean).join(' ');
  return (
    <section className={classNames} data-tour={tourId}>
      <header className="widget-header">
        <div className="widget-heading">
          <h2 className="widget-title">{title}</h2>
          {subtitle && <p className="widget-subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
