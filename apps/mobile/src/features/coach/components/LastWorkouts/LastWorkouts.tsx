import { IconBarbell, IconRun } from '@tabler/icons-react';
import { fill, isolateLtr, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { nameScript } from '../../../workouts/data/weekPlanDisplay';
import { coachCopy } from '../../copy';
import { dayMonthOf, localDateOf } from '../../data/coachMode';
import type { DatedWorkout } from '../../data/loggedWorkouts';
import './LastWorkouts.css';

interface LastWorkoutsProps {
  workouts: DatedWorkout[];
  timezone: string;
}

/** White rows: a type icon tile, the name, "3 דק׳ · 4/22 סטים · קושי 3/5", and the day at the end. */
export function LastWorkouts({ workouts, timezone }: LastWorkoutsProps) {
  const copy = useCopy(coachCopy);
  const language = useLanguage();

  return (
    <ul className="last-workouts">
      {workouts.map((entry) => {
        const date = entry.kind === 'cardio' ? entry.log.date : localDateOf(entry.at, timezone);
        const day = `${weekdayName(new Date(`${date}T00:00:00Z`).getUTCDay(), language, 'short')} ${dayMonthOf(date)}`;
        const rating = entry.kind === 'strength' ? entry.log.rating : undefined;
        const facts =
          entry.kind === 'strength'
            ? [
                entry.log.stats ? fill(copy.feed.minutes, { count: Math.max(1, Math.round(entry.log.stats.durationSec / 60)) }) : null,
                entry.log.stats ? fill(copy.feed.setsOf, { done: entry.log.stats.setsCompleted, total: entry.log.sets.length }) : null,
                rating !== undefined ? `${copy.detail.rating} ${isolateLtr(`${rating}/5`)}` : null,
              ]
            : [
                fill(copy.feed.minutes, { count: Math.max(1, Math.round(entry.log.completedSec / 60)) }),
                entry.log.roundsTotal > 0 ? fill(copy.feed.rounds, { done: entry.log.roundsDone, total: entry.log.roundsTotal }) : null,
              ];
        return (
          <li key={`${entry.kind}:${entry.log.id}`} className="last-workout">
            <span className={`last-workout-icon last-workout-icon-${entry.kind}`} aria-hidden="true">
              {entry.kind === 'cardio' ? <IconRun size={20} /> : <IconBarbell size={20} />}
            </span>
            <span className="last-workout-body">
              <span className="last-workout-name">
                <bdi {...nameScript(entry.log.workoutTitle)}>{entry.log.workoutTitle}</bdi>
              </span>
              <span className="last-workout-facts">{facts.filter(Boolean).join(' · ')}</span>
            </span>
            <span className="last-workout-day">{day}</span>
          </li>
        );
      })}
    </ul>
  );
}
