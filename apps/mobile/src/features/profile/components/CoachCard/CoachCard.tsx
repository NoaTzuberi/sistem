import { forwardRef } from 'react';
import { useCopy } from '@sistem/shared';
import { profileCopy } from '../../copy';
import './CoachCard.css';

interface CoachCardProps {
  coach: { name: string; initials: string };
}

/**
 * Her coach: initials, name, "your coach". No message button and no response-time line yet — there is
 * no coach chat and no reply-time data (see the report). Focusable so the coach chip can move focus here.
 */
export const CoachCard = forwardRef<HTMLElement, CoachCardProps>(function CoachCard({ coach }, ref) {
  const copy = useCopy(profileCopy);
  return (
    <section ref={ref} className="pf-coach" aria-labelledby="pf-coach-name" tabIndex={-1}>
      <span className="pf-coach-avatar" aria-hidden="true">
        {coach.initials}
      </span>
      <div className="pf-coach-text">
        <h2 className="pf-coach-name" id="pf-coach-name" dir="auto">
          {coach.name}
        </h2>
        <p className="pf-coach-sub">{copy.coachSubtitle}</p>
      </div>
    </section>
  );
});
