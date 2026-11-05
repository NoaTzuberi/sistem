import type { ReactNode } from 'react';
import './CoachSection.css';

interface CoachSectionProps {
  title: string;
  /** A link-style action at the end of the heading ("הכול", "עריכה קלה"). */
  action?: ReactNode;
  children: ReactNode;
}

/** A trainee tab's block: the Karantina heading on the page, its white tiles / rows / cards under it. */
export function CoachSection({ title, action, children }: CoachSectionProps) {
  return (
    <section className="coach-section">
      <div className="coach-section-head">
        <h2 className="coach-section-title display-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
