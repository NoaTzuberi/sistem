import { Link } from 'react-router-dom';
import type { CoachTraineeSummary } from '@sistem/types';
import { useCopy, useLanguage } from '@sistem/shared';
import { coachTraineePath } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import { waitingLine } from '../../data/coachMode';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import './WaitingCarousel.css';

interface WaitingCarouselProps {
  trainees: CoachTraineeSummary[];
  nowMs: number;
}

/** "מחכות לתוכנית": one white card per waiting trainee (longest wait first), scrolling sideways. */
export function WaitingCarousel({ trainees, nowMs }: WaitingCarouselProps) {
  const copy = useCopy(coachCopy);
  const language = useLanguage();
  return (
    <ul className="waiting-carousel">
      {trainees.map((trainee) => (
        <li key={trainee.id}>
          <Link className="waiting-card" to={coachTraineePath(trainee.id)}>
            <CoachAvatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} />
            <bdi className="waiting-card-name display-title">{trainee.name.trim().split(/\s+/)[0]}</bdi>
            <span className="waiting-card-line">{waitingLine(trainee, nowMs, copy, language)}</span>
            <span className="waiting-card-tag">{copy.today.waitingTag}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
