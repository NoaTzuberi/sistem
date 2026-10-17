import { fill, formatWeekRange, useCopy, useLanguage } from '@sistem/shared';
import type { PlannedWorkout } from '../../data/weekPlanDisplay';
import { workoutCopy } from '../../copy';
import './WeekHeader.css';

interface WeekHeaderProps {
  weekStartDate: string;
  workouts: PlannedWorkout[];
  doneCount: number;
}

/**
 * "This week" + its dates, and one pip per workout in its color (filled = done). The design's
 * "Week N" and "published by [coach]" are hidden: plans have no week number and trainee APIs don't
 * send the coach's name.
 */
export function WeekHeader({ weekStartDate, workouts, doneCount }: WeekHeaderProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  return (
    <div className="week-header">
      <div className="week-header-text">
        <span className="week-header-label">{copy.list.thisWeek}</span>
        <span className="week-header-range">{formatWeekRange(weekStartDate, language)}</span>
      </div>
      {workouts.length > 0 && (
        <span
          className="week-header-pips"
          role="img"
          aria-label={fill(copy.plan.weekPips, { done: doneCount, total: workouts.length })}
        >
          {workouts.map(({ workout, colorClass }) => (
            <span
              key={workout.id}
              className={`week-header-pip ${colorClass}` + (workout.status === 'done' ? ' week-header-pip-done' : '')}
            />
          ))}
        </span>
      )}
    </div>
  );
}
