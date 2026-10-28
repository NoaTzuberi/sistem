import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import { InviteSheet } from '../InviteSheet/InviteSheet';
import './InvitePill.css';

/** The pink "+ הזמנה" pill (Today stage, Trainees title): opens the invite sheet (QR + share). */
export function InvitePill() {
  const copy = useCopy(coachCopy);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" className="invite-pill" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        <IconPlus size={14} stroke={2.6} aria-hidden="true" />
        {copy.today.invite}
      </button>
      <InviteSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
