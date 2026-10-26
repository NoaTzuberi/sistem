import { Link } from 'react-router-dom';
import { IconPlus } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import './InvitePill.css';

/**
 * The pink "+ הזמנה" pill (Today stage, Trainees title). Phase A opens her link card on the Profile;
 * Phase B opens the invite sheet (QR + share) here.
 */
export function InvitePill() {
  const copy = useCopy(coachCopy);
  return (
    <Link className="invite-pill" to={ROUTES.COACH_PROFILE}>
      <IconPlus size={14} stroke={2.6} aria-hidden="true" />
      {copy.today.invite}
    </Link>
  );
}
