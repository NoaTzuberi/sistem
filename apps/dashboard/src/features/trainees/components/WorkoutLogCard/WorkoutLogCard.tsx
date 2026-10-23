import type { WorkoutLog } from '@sistem/types';
import { dateFormat, fill, formatDuration, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { traineesCopy } from '../../copy';
import { logState } from '../../hooks/useWorkoutLogs';
import { WorkoutLogDetails } from '../WorkoutLogDetails/WorkoutLogDetails';
import './WorkoutLogCard.css';

const MAX_RATING = 5;
const WORKOUT_TONES = 5;

/**
 * The same workout keeps the same identity color across her logs (the log does not know its place in the plan).
 * A free workout has no plan workout to match, so it gets no tone and keeps the card's default color.
 */
function toneOf(workoutId: string | null): number | undefined {
  if (workoutId === null) return undefined;
  let hash = 0;
  for (const char of workoutId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % WORKOUT_TONES;
}

interface WorkoutLogCardProps {
  log: WorkoutLog;
  timezone: string;
  isOpen: boolean;
  onToggle: () => void;
}

/** One log: its color strip, name, time and length, status, rating, a record and the photo — opening to the exercises. */
export function WorkoutLogCard({ log, timezone, isOpen, onToggle }: WorkoutLogCardProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const state = logState(log);
  const detailsId = `log-details-${log.id}`;
  const time = dateFormat(language, { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(log.startedAt));
  const minutes = log.stats ? Math.max(1, Math.round(log.stats.durationSec / 60)) : null;
  const hasRecord = (log.personalRecords?.length ?? 0) > 0;

  return (
    <article className="log-card" data-tone={toneOf(log.workoutId)} data-open={isOpen || undefined}>
      <button className="log-card-head" type="button" aria-expanded={isOpen} aria-controls={detailsId} onClick={onToggle}>
        <span className="log-card-strip" aria-hidden="true" />
        <span className="log-card-main">
          <bdi className="log-card-name" dir="auto">
            {log.workoutTitle}
          </bdi>
          <span className="log-card-meta">
            <bdi>{time}</bdi>
            {minutes !== null && (
              <>
                {' · '}
                {formatDuration(minutes * 60, language)}
              </>
            )}
          </span>
        </span>
        <span className="log-card-badges">
          {/* Her own workout (outside your plans) — trainee-owned history. */}
          {log.source === 'free' && <span className="log-card-free">{shared.coach.freeWorkout}</span>}
          <span className="log-card-status" data-state={state}>
            {state === 'partial' ? copy.logs.partial : shared.coach.logStatus[log.status]}
          </span>
          {log.rating !== undefined && (
            <span className="log-card-rating" role="img" aria-label={fill(copy.logs.rating, { rating: log.rating })}>
              {Array.from({ length: MAX_RATING }, (_, index) => (
                <span key={index} className="log-card-dot" data-on={index < (log.rating ?? 0) || undefined} />
              ))}
            </span>
          )}
          {hasRecord && (
            <span className="log-card-pr">
              <Icon name="award" size="sm" />
              {copy.logs.prPill}
            </span>
          )}
          {log.pumpPhoto && <img className="log-card-thumb" src={log.pumpPhoto.url} alt="" loading="lazy" />}
        </span>
        <span className="log-card-chevron" aria-hidden="true">
          <Icon name="chevronDown" size="sm" />
        </span>
      </button>
      {/* Always in the page so it can open smoothly; out of reach while closed. */}
      <div className="log-card-body" id={detailsId} inert={!isOpen}>
        <div className="log-card-body-inner">
          <WorkoutLogDetails log={log} />
        </div>
      </div>
    </article>
  );
}
