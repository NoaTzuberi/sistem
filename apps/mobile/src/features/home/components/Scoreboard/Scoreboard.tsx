import { formatNumber, useCopy, useLanguage } from '@sistem/shared';
import { homeCopy } from '../../copy';
import './Scoreboard.css';

interface ScoreboardProps {
  /** This week's workouts; null without a plan this week. */
  week: { done: number; planned: number } | null;
  /** Weeks in a row (the server's streak). */
  streak: number;
  /** kg, lifetime; 0 = nothing logged yet (hidden). */
  totalVolume: number;
}

const KG_PER_TONNE = 1000;

/** Three big numbers split by hairlines. A number without data is left out. */
export function Scoreboard({ week, streak, totalVolume }: ScoreboardProps) {
  const copy = useCopy(homeCopy);
  const language = useLanguage();
  const tonnes = totalVolume >= KG_PER_TONNE;
  const volume = tonnes
    ? formatNumber(totalVolume / KG_PER_TONNE, language, { maximumFractionDigits: 1 })
    : formatNumber(Math.round(totalVolume), language);

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
      {totalVolume > 0 && (
        <div className="scoreboard-cell">
          <dt className="scoreboard-label">{copy.score.totalVolume}</dt>
          <dd className="scoreboard-value" dir="ltr">
            {volume}
            <sup className="scoreboard-sup">{tonnes ? copy.score.tonnes : null}</sup>
          </dd>
        </div>
      )}
    </dl>
  );
}
