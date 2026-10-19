import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { describeLogSet, formatDateTime, groupLogSetsByExercise, logExerciseNames, sharedCopy, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Button } from '../../../../components/common/Button/Button';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { workoutSummaryPath } from '../../../../app/config/routes';
import { getWorkoutLog } from '../../../../services/workoutLogs/workoutLogsService';
import { BackButton } from '../../components/BackButton/BackButton';
import { PersonalRecordList } from '../../components/PersonalRecordList/PersonalRecordList';
import { SummaryStats } from '../../components/SummaryStats/SummaryStats';
import { workoutCopy } from '../../copy';
import type { SummaryLocationState } from '../WorkoutSummaryPage/WorkoutSummaryPage';
import { nameScript } from '../../data/weekPlanDisplay';
import './WorkoutLogPage.css';

// One workout log, read-only (PRD §5.4): what was performed, the summary and the Daily
// Pump photo. The summary itself is changed on the summary screen.
export function WorkoutLogPage() {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(workoutCopy);
  const { logId = '' } = useParams();
  const navigate = useNavigate();
  const load = useCallback(() => getWorkoutLog(logId), [logId]);
  const { data: log, error, isLoading, reload } = useLoad(load, copy.list.logLoadError);
  const exerciseNames = log ? logExerciseNames(log) : new Map<string, string>();
  const hasFullSummary = log?.rating !== undefined && log?.notes !== undefined && log?.pumpPhoto !== null;

  function openSummary() {
    const state: SummaryLocationState = { fromLog: true };
    navigate(workoutSummaryPath(logId), { state });
  }

  return (
    <AppShell>
      <div className="workout-log-page">
        <header className="workout-log-page-header">
          <BackButton />
          {log && (
            <div className="workout-log-page-heading">
              <h1 className="workout-log-page-title">
                <bdi className="display-name" {...nameScript(log.workoutTitle)}>
                  {log.workoutTitle}
                </bdi>
              </h1>
              <span className="workout-log-page-date">{formatDateTime(log.finishedAt ?? log.startedAt, language)}</span>
            </div>
          )}
        </header>

        {isLoading && !log && <StateMessage>{copy.list.loading}</StateMessage>}
        {error && !log && <StateMessage onRetry={reload}>{error}</StateMessage>}

        {log && (
          <>
            {log.stats && <SummaryStats stats={log.stats} />}
            <PersonalRecordList log={log} title={copy.summary.personalRecords} />

            {log.rating !== undefined && (
              <p className="workout-log-page-rating">
                {copy.summary.rating}: {log.rating} / 5
              </p>
            )}
            {log.notes && <p className="workout-log-page-notes" dir="auto">{log.notes}</p>}

            {log.pumpPhoto ? (
              <PrivatePhoto
                photo={log.pumpPhoto}
                alt={copy.pumpPhoto.alt}
                openLabel={copy.pumpPhoto.open}
                closeLabel={copy.summary.close}
                onLinkExpired={reload}
              />
            ) : (
              <p className="workout-log-page-photo-slot">{copy.pumpPhoto.noPhoto}</p>
            )}

            {log.status === 'completed' && (
              <Button variant="secondary" onClick={openSummary}>
                {hasFullSummary ? copy.list.editSummary : copy.list.addSummary}
              </Button>
            )}

            <ul className="workout-log-page-exercises">
              {groupLogSetsByExercise(log.sets).map((group, index) => (
                <li key={index} className="workout-log-page-exercise">
                  <span className="workout-log-page-exercise-name"><bdi>{exerciseNames.get(group.exerciseId) ?? shared.log.exercise}</bdi></span>
                  {group.sets.map((set) => (
                    <span key={set.setIndex} className="workout-log-page-set">
                      {describeLogSet(set, language)}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
