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
 * Sunday → Saturday as seven lanes. done = filled with the workout's identity color · planned = a
 * ring in it · missed = a faint ring · rest = an outline · today = ink with a pulsing dot. Tap a
 * lane to read its day below (WeekDayDetail). The statuses are the server's.
 */
export function WeekTrack({ days, selected, onSelect, label }: WeekTrackProps) {
  const language = useLanguage();
  const workoutText = useCopy(workoutCopy);

  return (
    <div className="week-track" role="group" aria-label={label}>
      {days.map((day) => {
        const first = day.workouts[0];
        const status = day.state === 'rest' ? null : workoutText.status[day.state === 'planned' ? 'upcoming' : day.state];
        const dayNumber = Number(day.date.slice(8));
        return (
          <button
            key={day.dayOfWeek}
            type="button"
            className={['week-lane', `week-lane-${day.state}`, day.isToday && 'week-lane-today', first?.colorClass]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={day.dayOfWeek === selected}
            aria-current={day.isToday ? 'date' : undefined}
            aria-label={[dayName(day.dayOfWeek, language), day.isToday ? workoutText.status.today : null, status].filter(Boolean).join(', ')}
            onClick={() => onSelect(day.dayOfWeek)}
          >
            <span className="week-lane-letter" aria-hidden="true">
              {weekdayName(day.dayOfWeek, language, 'narrow')}
            </span>
            <span className="week-lane-column" aria-hidden="true">
              <span className="week-lane-date">{dayNumber}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
