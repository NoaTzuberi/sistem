import { Link } from 'react-router-dom';
import type { TraineePlanWorkout } from '@sistem/types';
import { cardioMinutesLabel, cardioTotals, dayName, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { cardioDetailPath } from '../../../../app/config/routes';
import { workoutCopy } from '../../../workouts/copy';
import './CardioWeekList.css';

interface CardioWeekListProps {
  planId: string;
  /** Her plan's cardio workouts (kind 'cardio'), with the server's statuses. */
  workouts: TraineePlanWorkout[];
  /** Hide the day (Home shows one day at a time). */
  showDay?: boolean;
}

/** Cardio workouts as rows like a strength workout's: cardio tag, name, day · minutes · status. */
export function CardioWeekList({ planId, workouts, showDay = true }: CardioWeekListProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const workoutText = useCopy(workoutCopy);

  return (
    <ul className="cp-week">
      {workouts.map((workout) => {
        const status =
          workout.status === 'done' ? workoutText.status.done : workout.status === 'missed' ? workoutText.status.missed : workout.isToday ? workoutText.status.today : null;
        const minutes = workout.cardio ? cardioMinutesLabel(cardioTotals(workout.cardio.steps).totalSec, language) : null;
        const day = showDay ? (workout.dayOfWeek !== undefined ? dayName(workout.dayOfWeek, language) : workoutText.list.anyDay) : null;
        return (
          <li key={workout.id}>
            <Link className="cp-week-row" to={cardioDetailPath(planId, workout.id)} data-status={workout.status}>
              <span className="cp-week-tag">{shared.cardio.cardioTag}</span>
              <span className="cp-week-text">
                <bdi className="cp-week-name" dir="auto">
                  {workout.title}
                </bdi>
                <span className="cp-week-meta">{[day, minutes].filter(Boolean).join(' · ')}</span>
              </span>
              {status && <span className="cp-week-status">{status}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
