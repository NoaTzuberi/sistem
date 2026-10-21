import { useEffect, useState } from 'react';
import { fill, useCopy } from '@sistem/shared';
import { IconChevronDown } from '@tabler/icons-react';
import { initialsOf } from '../../../home/data/homeDisplay';
import { nutritionCopy } from '../../copy';
import './CoachCard.css';

interface CoachCardProps {
  /** The coach's note on this plan version (plain text, line breaks kept). */
  text: string;
  /** null = unknown (an older cached plan): a neutral title, no initials. */
  coachName: string | null;
  /** Not read yet: a pink dot, and it opens (PRD 13a+: open while unseen, collapsible either way). */
  unread: boolean;
  /** Called once when she sees the whole note. */
  onRead?: () => void;
}

/** The coach's note as a soft card: avatar, "Message from …", one line — tap to expand / collapse. */
export function CoachCard({ text, coachName, unread, onRead }: CoachCardProps) {
  const copy = useCopy(nutritionCopy);
  const [isOpen, setIsOpen] = useState(unread);

  useEffect(() => {
    if (isOpen) onRead?.();
  }, [isOpen, onRead]);

  const name = coachName?.trim() || null;

  return (
    <button type="button" className={'tn-coach' + (isOpen ? ' tn-coach-open' : '')} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
      <span className={'tn-coach-avatar' + (unread ? ' tn-coach-avatar-unread' : '')} aria-hidden="true">
        {name ? initialsOf(name) : null}
      </span>
      <span className="tn-coach-body">
        <b className="tn-coach-title" dir="auto">
          {name ? fill(copy.coachFrom, { name }) : copy.introTitle}
        </b>
        {unread && <span className="tn-coach-hidden">{copy.coachUnread}</span>}
        <span className="tn-coach-text" dir="auto">
          {text}
        </span>
      </span>
      <IconChevronDown className="tn-coach-chevron" size={16} stroke={2} aria-hidden="true" />
    </button>
  );
}
