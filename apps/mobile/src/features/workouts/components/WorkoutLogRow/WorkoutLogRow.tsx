import { Link } from 'react-router-dom';
import { fill, useCopy, useLanguage } from '@sistem/shared';
import { workoutLogPath } from '../../../../app/config/routes';
import { formatLogDay, formatLogTime, minutesOf, type HistoryLog } from '../../data/historyDisplay';
import { nameScript } from '../../data/weekPlanDisplay';
import { workoutCopy } from '../../copy';
import './WorkoutLogRow.css';

const RATING_DOTS = [1, 2, 3, 4, 5];

interface WorkoutLogRowProps {
  item: HistoryLog;
  timeZone: string;
}

/** One completed workout: color bar, name, day · time, tags, minutes and rating. Opens the existing log screen. */
export function WorkoutLogRow({ item, timeZone }: WorkoutLogRowProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  const { log } = item;
  const at = log.finishedAt ?? log.startedAt;

  return (
    <Link
      to={workoutLogPath(log.id)}
      className={'workout-log-row ' + (item.isFree ? 'workout-log-row-free' : (item.colorClass ?? 'workout-log-row-unplanned'))}
    >
      <span className="workout-log-row-bar" aria-hidden="true" />
      <span className="workout-log-row-main">
        <span className="workout-log-row-name">
          <bdi className="display-name" {...nameScript(log.workoutTitle)}>
            {log.workoutTitle}
          </bdi>
        </span>
        <span className="workout-log-row-meta">
          <span>
            {formatLogDay(at, timeZone, language)} · {formatLogTime(at, timeZone, language)}
          </span>
          {item.prCount > 0 && <span className="workout-log-row-tag workout-log-row-tag-pr">{copy.history.tagPr}</span>}
          {item.isFree && <span className="workout-log-row-tag workout-log-row-tag-free">{copy.history.tagFree}</span>}
          {item.isPartial && <span className="workout-log-row-tag workout-log-row-tag-partial">{copy.history.tagPartial}</span>}
        </span>
      </span>
      <span className="workout-log-row-end">
        {log.stats && (
          <span className="workout-log-row-minutes">
            <span className="workout-log-row-minutes-value">{minutesOf(log.stats.durationSec)}</span>
            <span className="workout-log-row-minutes-unit">{copy.history.minutesUnit}</span>
          </span>
        )}
        {log.rating !== undefined && (
          <span className="workout-log-row-rating" role="img" aria-label={fill(copy.history.rating, { value: log.rating })}>
            {RATING_DOTS.map((dot) => (
              <span key={dot} className={'workout-log-row-dot' + (dot <= (log.rating ?? 0) ? ' workout-log-row-dot-on' : '')} />
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
