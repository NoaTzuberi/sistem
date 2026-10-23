import { IconUsers, IconX } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { homeCopy } from '../../copy';
import './JoinCoachCard.css';

interface JoinCoachCardProps {
  onOpen: () => void;
  onDismiss: () => void;
}

/** Self-guided Home only: a quiet "Have a coach? Enter a code" — dismissible, remembered on the device. */
export function JoinCoachCard({ onOpen, onDismiss }: JoinCoachCardProps) {
  const copy = useCopy(homeCopy).joinCoach;
  return (
    <aside className="sg-join-card" aria-label={copy.label}>
      <button type="button" className="sg-join-card-open" onClick={onOpen}>
        <span className="sg-join-card-icon" aria-hidden="true">
          <IconUsers size={18} />
        </span>
        <span className="sg-join-card-text">{copy.text}</span>
      </button>
      <button type="button" className="sg-join-card-dismiss" onClick={onDismiss} aria-label={copy.dismiss}>
        <IconX size={14} stroke={2.6} aria-hidden="true" />
      </button>
    </aside>
  );
}
