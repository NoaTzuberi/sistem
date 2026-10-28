import { IconX } from '@tabler/icons-react';
import { fill, useCopy } from '@sistem/shared';
import { homeCopy } from '../../copy';
import './CoachingEndedCard.css';

interface CoachingEndedCardProps {
  coachName: string;
  onDismiss: () => void;
}

/** "<coach> ended the coaching" — her in-app notice; hiding it marks it read. Her history stays. */
export function CoachingEndedCard({ coachName, onDismiss }: CoachingEndedCardProps) {
  const copy = useCopy(homeCopy).coachingEnded;
  return (
    <aside className="coaching-ended-card" aria-label={copy.label} role="status">
      <p className="coaching-ended-card-text">{fill(copy.text, { coach: coachName })}</p>
      <button type="button" className="coaching-ended-card-dismiss" onClick={onDismiss} aria-label={copy.dismiss}>
        <IconX size={14} stroke={2.6} aria-hidden="true" />
      </button>
    </aside>
  );
}
