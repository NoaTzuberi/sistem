import { Link } from 'react-router-dom';
import { fill, useCopy, useLanguage } from '@sistem/shared';
import { workoutLogPath, workoutPath } from '../../../../app/config/routes';
import { workoutCopy } from '../../../workouts/copy';
import { exerciseCountLabel } from '../../../workouts/data/workoutDisplay';
import { type PlannedWorkout, type WeekDay, isHebrewText } from '../../data/homeDisplay';
import { homeCopy } from '../../copy';
import './WeekDayDetail.css';

interface WeekDayDetailProps {
  day: WeekDay;
  planId: string | null;
}

/** The selected lane, read out: color chip + workout name + status — or "rest day · recovery". */
export function WeekDayDetail({ day, planId }: WeekDayDetailProps) {
  const copy = useCopy(homeCopy);
  const workoutText = useCopy(workoutCopy);
  const language = useLanguage();

  function statusOf({ workout }: PlannedWorkout): string {
    if (workout.status === 'done') return copy.week.done;
    if (workout.inProgress) return workoutText.status.inProgress;
    if (workout.status === 'missed') return workoutText.status.missed;
    if (workout.isToday) return fill(copy.week.today, { exercises: exerciseCountLabel(workout.exercises.length, workoutText, language) });
    return copy.week.planned;
  }

  return (
    <div className="week-day-detail" aria-live="polite">
      {day.workouts.length === 0 && (
        <p className="week-day-detail-row week-day-detail-rest">
          <span className="week-day-detail-chip" aria-hidden="true" />
          {copy.week.rest}
        </p>
      )}
      {planId &&
        day.workouts.map((planned) => (
          <Link
            key={planned.workout.id}
            className={`week-day-detail-row ${planned.colorClass}`}
            to={planned.workout.logId ? workoutLogPath(planned.workout.logId) : workoutPath(planId, planned.workout.id)}
          >
            <span className="week-day-detail-chip" aria-hidden="true" />
            <bdi
              className={'week-day-detail-name' + (isHebrewText(planned.workout.title) ? ' week-day-detail-name-he' : '')}
              dir="auto"
            >
              {planned.workout.title}
            </bdi>
            <span className="week-day-detail-status">{statusOf(planned)}</span>
          </Link>
        ))}
    </div>
  );
}
