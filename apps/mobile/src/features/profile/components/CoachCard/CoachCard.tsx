import { forwardRef } from 'react';
import type { CoachPayment, CoachingStatus, PrivatePhoto } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { AvatarPhoto } from '../../../../components/common/AvatarPhoto/AvatarPhoto';
import { CoachPayments } from '../CoachPayments/CoachPayments';
import { profileCopy } from '../../copy';
import './CoachCard.css';

interface CoachCardProps {
  coach: { name: string; initials: string };
  /** Her photo (signed link), or null = initials. */
  avatar?: PrivatePhoto | null;
  status?: CoachingStatus | null;
  /** Her payment links — only sent to trainees with a live coaching with her. */
  payment?: CoachPayment | null;
  onToast: (text: string) => void;
}

/**
 * Her coach: photo (or initials), name, "your coach" (or "building your plan" while waiting), and her
 * payment links when she set any. No message button / response time yet (no coach chat, no data).
 * Focusable so the coach chip can move focus here.
 */
export const CoachCard = forwardRef<HTMLElement, CoachCardProps>(function CoachCard({ coach, avatar, status, payment, onToast }, ref) {
  const copy = useCopy(profileCopy);
  return (
    <section ref={ref} className="pf-coach" aria-labelledby="pf-coach-name" tabIndex={-1}>
      <div className="pf-coach-head">
        <span className="pf-coach-avatar" aria-hidden="true">
          {coach.initials}
          <AvatarPhoto url={avatar?.url ?? null} />
        </span>
        <div className="pf-coach-text">
          <h2 className="pf-coach-name" id="pf-coach-name" dir="auto">
            {coach.name}
          </h2>
          <p className="pf-coach-sub">{status === 'waiting' ? copy.coachWaiting : copy.coachSubtitle}</p>
        </div>
      </div>
      {payment && <CoachPayments payment={payment} onToast={onToast} />}
    </section>
  );
});
