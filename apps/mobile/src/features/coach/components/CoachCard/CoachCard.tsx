import type { ReactNode } from 'react';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import './CoachCard.css';

interface CoachCardProps {
  title?: string;
  /** The Latin mono eyebrow next to the title (decoration). */
  eyebrow?: string;
  /** A link / button at the end of the title row. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A white card on the page surface, with an optional title row. */
export function CoachCard({ title, eyebrow, action, children, className }: CoachCardProps) {
  return (
    <section className={'coach-card' + (className ? ` ${className}` : '')}>
      {title && (
        <div className="coach-card-head">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h3 className="coach-card-title">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
