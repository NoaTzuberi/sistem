import { type ReactNode, useId } from 'react';
import { Link } from 'react-router-dom';
import './TodaySection.css';

interface TodaySectionProps {
  title: string;
  /** The quiet link at the end of the title row ("הכול · 15", "לכל הפעילות"). */
  link?: { label: string; to: string };
  /** The rows (<li>s), shown in one white card. */
  children: ReactNode;
}

/** A Today section: a Karantina title (+ link) over one white card of rows divided by hairlines. */
export function TodaySection({ title, link, children }: TodaySectionProps) {
  const titleId = useId();
  return (
    <section className="today-section" aria-labelledby={titleId}>
      <div className="today-section-head">
        <h2 className="today-section-title display-title" id={titleId}>
          {title}
        </h2>
        {link && (
          <Link className="coach-link" to={link.to}>
            {link.label}
          </Link>
        )}
      </div>
      <ul className="today-section-list">{children}</ul>
    </section>
  );
}
