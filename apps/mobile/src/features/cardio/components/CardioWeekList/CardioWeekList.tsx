import { Link } from 'react-router-dom';
import type { CardioOccurrence } from '@sistem/types';
import { cardioMinutesLabel, cardioTotals, dayName, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { cardioDetailPath } from '../../../../app/config/routes';
import { workoutCopy } from '../../../workouts/copy';
import './CardioWeekList.css';

interface CardioWeekListProps {
  items: CardioOccurrence[];
  /** Hide the day (Home shows one day at a time). */
  showDay?: boolean;
}

/** Cardio days as rows like a strength workout's: cardio tag, name, day · minutes · status. */
export function CardioWeekList({ items, showDay = true }: CardioWeekListProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const workoutText = useCopy(workoutCopy);

  return (
    <ul className="cp-week">
      {items.map((item) => {
        const status = item.status === 'done' ? workoutText.status.done : item.status === 'missed' ? workoutText.status.missed : item.isToday ? workoutText.status.today : null;
        const meta = [showDay ? dayName(item.dayOfWeek, language) : null, cardioMinutesLabel(cardioTotals(item.session.steps).totalSec, language)].filter(Boolean).join(' · ');
        return (
          <li key={`${item.session.id}-${item.date}`}>
            <Link className="cp-week-row" to={cardioDetailPath(item.session.id, item.date)} data-status={item.status}>
              <span className="cp-week-tag">{shared.cardio.cardioTag}</span>
              <span className="cp-week-text">
                <bdi className="cp-week-name" dir="auto">
                  {item.session.name}
                </bdi>
                <span className="cp-week-meta">{meta}</span>
              </span>
              {status && <span className="cp-week-status">{status}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
