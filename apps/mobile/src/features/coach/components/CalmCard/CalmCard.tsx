import { IconCheck } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import './CalmCard.css';

/** Nothing needs her: a calm card with a Cherry check (never green). */
export function CalmCard() {
  const copy = useCopy(coachCopy).today;
  return (
    <div className="calm-card">
      <span className="calm-card-check" aria-hidden="true">
        <IconCheck size={24} stroke={2.6} />
      </span>
      <span className="calm-card-text">
        <span className="calm-card-title">{copy.calmTitle}</span>
        <span className="calm-card-body">{copy.calmBody}</span>
      </span>
    </div>
  );
}
