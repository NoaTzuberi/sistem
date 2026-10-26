import type { CoachTraineeThisWeek, WorkoutStatus } from '@sistem/types';
import { addDaysToDate, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { workoutColorClass } from '../../../home/data/homeDisplay';
import { coachCopy } from '../../copy';
import './WeekLanes.css';

interface WeekLanesProps {
  week: CoachTraineeThisWeek;
  /** Sunday of her week ('YYYY-MM-DD'). */
  weekStart: string;
  /** Her today ('YYYY-MM-DD', her zone). */
  today: string;
}

type LaneState = 'done' | 'planned' | 'missed' | 'rest';

const LANE_OF: Record<WorkoutStatus, LaneState> = { done: 'done', upcoming: 'planned', missed: 'missed' };

/**
 * Her week, Sunday → Saturday. A dated workout colors its day with its identity color (its place in the plan,
 * as in her app): done = filled, planned = ringed, missed = a dot; today has an ink ring. Statuses are the server's.
 */
export function WeekLanes({ week, weekStart, today }: WeekLanesProps) {
  const copy = useCopy(coachCopy).detail;
  const language = useLanguage();

  return (
    <ol className="week-lanes">
      {Array.from({ length: 7 }, (_, day) => {
        const date = addDaysToDate(weekStart, day);
        const index = week.workouts.findIndex((workout) => workout.dayOfWeek === day);
        const workout = index === -1 ? null : week.workouts[index];
        const state: LaneState = workout ? LANE_OF[workout.status] : 'rest';
        const isToday = date === today;
        const label = [weekdayName(day, language), workout?.title, copy.lane[state], isToday ? copy.lane.today : null].filter(Boolean).join(', ');
        return (
          <li
            key={date}
            className={`week-lane week-lane-${state}${isToday ? ' week-lane-today' : ''}${index === -1 ? '' : ` ${workoutColorClass(index)}`}`}
            aria-label={label}
          >
            <span className="week-lane-day" aria-hidden="true">
              {weekdayName(day, language, 'narrow')}
            </span>
            <span className="week-lane-col" aria-hidden="true">
              {Number(date.slice(8))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
