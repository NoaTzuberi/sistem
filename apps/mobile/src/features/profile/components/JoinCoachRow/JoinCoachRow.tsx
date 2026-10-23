import { IconChevronRight, IconUsers } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { profileCopy } from '../../copy';
import './JoinCoachRow.css';

/** Self-guided Profile: in place of the coach card, "Join a coach" → the code + confirm screens. */
export function JoinCoachRow({ onOpen }: { onOpen: () => void }) {
  const copy = useCopy(profileCopy).joinCoach;
  return (
    <button type="button" className="sg-join-row" onClick={onOpen}>
      <span className="sg-join-row-icon" aria-hidden="true">
        <IconUsers size={20} />
      </span>
      <span className="sg-join-row-text">
        <span className="sg-join-row-title">{copy.title}</span>
        <span className="sg-join-row-sub">{copy.sub}</span>
      </span>
      <IconChevronRight className="flip-rtl" size={18} aria-hidden="true" />
    </button>
  );
}
