import { useCallback, useState } from 'react';
import type { WorkoutLog } from '@sistem/types';
import {
  describeLogSet,
  describePersonalRecord,
  formatDateTime,
  formatDuration,
  groupLogSetsByExercise,
  logExerciseNames,
  fill,
  prCountLabel,
  sharedCopy,
  useCopy,
  useLanguage,
  useLoad,
} from '@sistem/shared';
import { IconCamera, IconChevronDown } from '@tabler/icons-react';
import { listTraineeWorkoutLogs } from '../../../../services/coach/coachService';
import { Badge } from '../../../../components/common/Badge/Badge';
import { Button } from '../../../../components/common/Button/Button';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import './WorkoutLogList.css';

interface WorkoutLogListProps {
  traineeId: string;
  /** Shows this many, then "more" (all at once when unset). */
  pageSize?: number;
  /** The "more" button's label. */
  moreLabel?: string;
  /** Another source of her logs (the read-only archive); default = the live coaching's. */
  load?: () => Promise<WorkoutLog[]>;
}

// The trainee's logs with their summaries (PRD §6): stats, PRs, rating, notes and the
// Daily Pump photo — a short-lived signed link the server makes for her coach only.
export function WorkoutLogList({ traineeId, pageSize, moreLabel, load: loadLogs }: WorkoutLogListProps) {
  const shared = useCopy(sharedCopy);
  const copy = shared.coach;
  const language = useLanguage();
  const load = useCallback(() => (loadLogs ? loadLogs() : listTraineeWorkoutLogs(traineeId)), [loadLogs, traineeId]);
  const { data: logs, error, isLoading, reload } = useLoad(load, copy.logsLoadError);
  const [shown, setShown] = useState(pageSize ?? Infinity);

  if (isLoading && !logs) return <StateMessage>{shared.common.loading}</StateMessage>;
  if (!logs) return <StateMessage onRetry={reload}>{error}</StateMessage>;
  if (logs.length === 0) return <StateMessage>{copy.noLogs}</StateMessage>;

  return (
    <>
      <ul className="workout-logs">
        {logs.slice(0, shown).map((log) => {
          const names = logExerciseNames(log);
          const records = log.personalRecords ?? [];
          return (
            <li key={log.id}>
              <details className="workout-log">
                <summary className="workout-log-summary">
                  <span className="workout-log-heading">
                    <span className="workout-log-title" dir="auto">{log.workoutTitle}</span>
                    <span className="workout-log-date">{formatDateTime(log.startedAt, language)}</span>
                    <span className="workout-log-badges">
                      <Badge variant={log.status === 'completed' ? 'accent' : 'neutral'}>{copy.logStatus[log.status]}</Badge>
                      {log.rating !== undefined && <Badge variant="neutral">{fill(copy.rating, { rating: log.rating })}</Badge>}
                      {records.length > 0 && <Badge variant="accent">{prCountLabel(records.length, language)}</Badge>}
                      {log.pumpPhoto && (
                        <Badge variant="neutral" aria-label={copy.hasPumpPhoto}>
                          <IconCamera size={14} aria-hidden="true" />
                        </Badge>
                      )}
                    </span>
                  </span>
                  <IconChevronDown className="workout-log-chevron" size={20} aria-hidden="true" />
                </summary>

                <div className="workout-log-body">
                  {log.stats && (
                    <dl className="workout-log-stats">
                      <div>
                        <dt>{copy.duration}</dt>
                        <dd>{formatDuration(log.stats.durationSec, language)}</dd>
                      </div>
                      <div>
                        <dt>{copy.totalVolume}</dt>
                        <dd>
                          {log.stats.totalVolume} {shared.units.kg}
                        </dd>
                      </div>
                      <div>
                        <dt>{copy.setsCompleted}</dt>
                        <dd>{log.stats.setsCompleted}</dd>
                      </div>
                      <div>
                        <dt>{copy.personalRecords}</dt>
                        <dd>{log.stats.prCount}</dd>
                      </div>
                    </dl>
                  )}

                  {records.length > 0 && (
                    <ul className="workout-log-records">
                      {records.map((record) => (
                        <li key={record.exerciseId}>{describePersonalRecord(record, names.get(record.exerciseId), language)}</li>
                      ))}
                    </ul>
                  )}

                  {log.notes && (
                    <p className="workout-log-notes" dir="auto">
                      {log.notes}
                    </p>
                  )}

                  {log.pumpPhoto ? (
                    <PrivatePhoto
                      photo={log.pumpPhoto}
                      alt={fill(copy.pumpPhotoAlt, { workout: log.workoutTitle })}
                      openLabel={copy.openPumpPhoto}
                      closeLabel={shared.common.close}
                      onLinkExpired={reload}
                    />
                  ) : (
                    <p className="workout-log-photo-slot">{copy.noPumpPhoto}</p>
                  )}

                  {groupLogSetsByExercise(log.sets).map((group, index) => (
                    <div key={index} className="workout-log-exercise">
                      <span className="workout-log-exercise-name" dir="auto">{names.get(group.exerciseId) ?? shared.log.exercise}</span>
                      {group.sets.map((set) => (
                        <span key={set.setIndex} className="workout-log-set">
                          {describeLogSet(set, language)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {logs.length > shown && pageSize && (
        <Button variant="secondary" className="workout-logs-more" onClick={() => setShown((count) => count + pageSize)}>
          {moreLabel}
        </Button>
      )}
    </>
  );
}
