import { useCopy } from '@sistem/shared';
import { homeCopy } from '../../copy';
import './Scoreboard.css';

interface ScoreboardProps {
  /** This week's workouts; null without a plan this week. */
  week: { done: number; planned: number } | null;
  /** Weeks in a row (the server's streak). */
  streak: number;
}

/** Two big numbers split by a hairline. A number without data is left out. */
export function Scoreboard({ week, streak }: ScoreboardProps) {
  const copy = useCopy(homeCopy);

  return (
    <dl className="scoreboard" aria-label={copy.score.title}>
      {week && (
        <div className="scoreboard-cell">
          <dt className="scoreboard-label">{copy.score.workoutsThisWeek}</dt>
          <dd className="scoreboard-value" dir="ltr">
            {String(week.done).padStart(2, '0')}
            <sup className="scoreboard-sup">/{week.planned}</sup>
          </dd>
        </div>
      )}
      <div className="scoreboard-cell">
        <dt className="scoreboard-label">{copy.score.weeksInRow}</dt>
        <dd className="scoreboard-value" dir="ltr">
          {streak}
        </dd>
      </div>
    </dl>
  );
}
