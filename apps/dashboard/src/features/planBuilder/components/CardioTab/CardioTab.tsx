import { Link } from 'react-router-dom';
import type { CardioSession } from '@sistem/types';
import { cardioMinutesLabel, cardioTotals, dayName, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { cardioCopy } from '../../../cardio/copy';
import './CardioTab.css';

interface CardioTabProps {
  session: CardioSession;
  to: string;
}

/** A cardio session of this week next to the workout tabs: opens its own builder. */
export function CardioTab({ session, to }: CardioTabProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(cardioCopy);
  const meta = [
    session.days.map((day) => dayName(day, language)).join(' · '),
    cardioMinutesLabel(cardioTotals(session.steps).totalSec, language),
    session.status === 'draft' ? copy.draftTag : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link className="cardio-tab" to={to}>
      <span className="cardio-tab-tag">{shared.cardio.cardioTag}</span>
      <span className="cardio-tab-text">
        <bdi className="cardio-tab-name">{session.name}</bdi>
        <span className="cardio-tab-meta">{meta}</span>
      </span>
    </Link>
  );
}
