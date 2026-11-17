import { useState } from 'react';
import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import { InviteSheet } from '../InviteSheet/InviteSheet';
import './InviteFirstCard.css';

/** A coach with no trainees yet: the invite is the main card (the sheet has the link, share and QR). */
export function InviteFirstCard() {
  const copy = useCopy(coachCopy).today;
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="invite-first">
      <h2 className="invite-first-title display-title">{copy.inviteTitle}</h2>
      <p className="invite-first-body">{copy.inviteBody}</p>
      <button type="button" className="invite-first-action" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        {copy.inviteAction}
      </button>
      <InviteSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
