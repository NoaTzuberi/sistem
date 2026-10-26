import type { CoachTraineeThisWeek } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import './WeekPips.css';

/** This week's workouts as small pips: done = her color. The count is read out, the pips are decoration. */
export function WeekPips({ week }: { week: CoachTraineeThisWeek }) {
  const copy = useCopy(coachCopy);
  if (week.planned === 0) return null;
  return (
    <span className="week-pips" role="img" aria-label={fill(copy.list.weekProgress, { done: week.completed, planned: week.planned })}>
      {week.workouts.map((workout) => (
        <i key={workout.id} className={'week-pip' + (workout.status === 'done' ? ' week-pip-done' : '')} />
      ))}
    </span>
  );
}
