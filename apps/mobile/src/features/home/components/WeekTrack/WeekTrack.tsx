import { dayName, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { workoutCopy } from '../../../workouts/copy';
import type { WeekDay } from '../../data/homeDisplay';
import './WeekTrack.css';

interface WeekTrackProps {
  days: WeekDay[];
  selected: number;
  onSelect: (dayOfWeek: number) => void;
  label: string;
}

/**
 * Sunday → Saturday as seven lanes, drawn by `day.look` (homeDisplay): done = filled with the
 * workout's color · today = ink · planned = ringed in its color · missed = soft with a dot in its
 * color · rest = a hairline. Today also has the pulsing dot (done or not). Tap a lane to read its
 * day below (WeekDayDetail). The statuses are the server's.
 */
export function WeekTrack({ days, selected, onSelect, label }: WeekTrackProps) {
  const language = useLanguage();
  const workoutText = useCopy(workoutCopy);

  return (
    <div className="week-track" role="group" aria-label={label}>
      {days.map((day) => {
        const status = day.state === 'rest' ? null : workoutText.status[day.state === 'planned' ? 'upcoming' : day.state];
        return (
          <button
            key={day.dayOfWeek}
            type="button"
            className={['week-lane', `week-lane-${day.look}`, day.pulse && 'week-lane-pulse', day.colorClass].filter(Boolean).join(' ')}
            aria-pressed={day.dayOfWeek === selected}
            aria-current={day.isToday ? 'date' : undefined}
            aria-label={[dayName(day.dayOfWeek, language), day.isToday ? workoutText.status.today : null, status].filter(Boolean).join(', ')}
            onClick={() => onSelect(day.dayOfWeek)}
          >
            <span className="week-lane-letter" aria-hidden="true">
              {weekdayName(day.dayOfWeek, language, 'narrow')}
            </span>
            <span className="week-lane-column" aria-hidden="true">
              <span className="week-lane-date">{Number(day.date.slice(8))}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
