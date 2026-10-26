import { fill, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { nameScript } from '../../../workouts/data/weekPlanDisplay';
import { coachCopy } from '../../copy';
import { dayMonthOf, localDateOf, workoutColorOf } from '../../data/coachMode';
import type { DatedWorkout } from '../../data/loggedWorkouts';
import './LastWorkouts.css';

interface LastWorkoutsProps {
  workouts: DatedWorkout[];
  timezone: string;
}

/** Workout rows: a color bar, the name, "ג׳ 27.10 · 42 דק׳ · 18/18 סטים", and her rating. */
export function LastWorkouts({ workouts, timezone }: LastWorkoutsProps) {
  const copy = useCopy(coachCopy);
  const language = useLanguage();

  return (
    <ul className="last-workouts">
      {workouts.map((entry) => {
        const date = entry.kind === 'cardio' ? entry.log.date : localDateOf(entry.at, timezone);
        const day = `${weekdayName(new Date(`${date}T00:00:00Z`).getUTCDay(), language, 'short')} ${dayMonthOf(date)}`;
        const facts =
          entry.kind === 'strength'
            ? [
                entry.log.stats ? fill(copy.feed.minutes, { count: Math.max(1, Math.round(entry.log.stats.durationSec / 60)) }) : null,
                entry.log.stats ? fill(copy.feed.setsOf, { done: entry.log.stats.setsCompleted, total: entry.log.sets.length }) : null,
              ]
            : [
                fill(copy.feed.minutes, { count: Math.max(1, Math.round(entry.log.completedSec / 60)) }),
                entry.log.roundsTotal > 0 ? fill(copy.feed.rounds, { done: entry.log.roundsDone, total: entry.log.roundsTotal }) : null,
              ];
        const rating = entry.kind === 'strength' ? entry.log.rating : undefined;
        return (
          <li key={`${entry.kind}:${entry.log.id}`} className={`last-workout ${workoutColorOf(entry.log.workoutTitle)}`}>
            <i className="last-workout-bar" aria-hidden="true" />
            <span className="last-workout-body">
              <bdi className="last-workout-name display-name" {...nameScript(entry.log.workoutTitle)}>
                {entry.log.workoutTitle}
              </bdi>
              <span className="last-workout-facts">{[day, ...facts].filter(Boolean).join(' · ')}</span>
            </span>
            {rating !== undefined && (
              <span className="last-workout-rating">
                <span className="last-workout-rating-value" dir="ltr">
                  {rating}/5
                </span>
                <span className="last-workout-rating-label">{copy.detail.rating}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
