import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconCamera, IconPencil, IconPlus } from '@tabler/icons-react';
import { formatDateTime, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { workoutSummaryPath } from '../../../../app/config/routes';
import { getWorkoutLog } from '../../../../services/workoutLogs/workoutLogsService';
import { BackButton } from '../../components/BackButton/BackButton';
import { PersonalRecordList } from '../../components/PersonalRecordList/PersonalRecordList';
import { LogReactions } from '../../../messages/components/LogReactions/LogReactions';
import { SummaryStats } from '../../components/SummaryStats/SummaryStats';
import { WorkoutLogSets } from '../../components/WorkoutLogSets/WorkoutLogSets';
import { workoutCopy } from '../../copy';
import type { SummaryLocationState } from '../WorkoutSummaryPage/WorkoutSummaryPage';
import { nameScript } from '../../data/weekPlanDisplay';
import './WorkoutLogPage.css';

// One workout log, read-only (PRD §5.4, direction B): the hero card, the stats, the summary and the
// Daily Pump photo, then what was performed. The summary itself is changed on the summary screen.
export function WorkoutLogPage() {
  const language = useLanguage();
  const copy = useCopy(workoutCopy);
  const { logId = '' } = useParams();
  const navigate = useNavigate();
  const load = useCallback(() => getWorkoutLog(logId), [logId]);
  const { data: log, error, isLoading, reload } = useLoad(load, copy.list.logLoadError);
  const hasFullSummary = log?.rating !== undefined && log?.notes !== undefined && log?.pumpPhoto !== null;

  function openSummary() {
    const state: SummaryLocationState = { fromLog: true };
    navigate(workoutSummaryPath(logId), { state });
  }

  return (
    <AppShell bleed surface="soft">
      <div className="wk-log">
        <div className="wk-log-top">
          <BackButton variant="disc" />
        </div>

        {isLoading && !log && <StateMessage>{copy.list.loading}</StateMessage>}
        {error && !log && <StateMessage onRetry={reload}>{error}</StateMessage>}

        {log && (
          <>
            <section className="wk-log-hero">
              <span className="wk-log-date">{formatDateTime(log.finishedAt ?? log.startedAt, language)}</span>
              <h1 className="wk-log-title">
                <bdi className="display-name" {...nameScript(log.workoutTitle)}>
                  {log.workoutTitle}
                </bdi>
              </h1>
              <LogReactions logId={log.id} />
            </section>

            {log.stats && <SummaryStats stats={log.stats} />}
            <PersonalRecordList log={log} title={copy.summary.personalRecords} />

            {log.rating !== undefined && (
              <p className="wk-log-rating">
                {copy.summary.rating}: <bdi dir="ltr">{log.rating} / 5</bdi>
              </p>
            )}
            {log.notes && (
              <p className="wk-log-notes" dir="auto">
                {log.notes}
              </p>
            )}

            {log.pumpPhoto ? (
              <PrivatePhoto
                photo={log.pumpPhoto}
                alt={copy.pumpPhoto.alt}
                openLabel={copy.pumpPhoto.open}
                closeLabel={copy.summary.close}
                onLinkExpired={reload}
              />
            ) : (
              <p className="wk-log-photo-slot">
                <span className="wk-log-photo-icon" aria-hidden="true">
                  <IconCamera size={20} stroke={2} />
                </span>
                {copy.pumpPhoto.noPhoto}
              </p>
            )}

            {log.status === 'completed' && (
              <PillButton variant="soft" className="wk-log-summary" icon={hasFullSummary ? <IconPencil size={18} /> : <IconPlus size={18} stroke={2.4} />} onClick={openSummary}>
                {hasFullSummary ? copy.list.editSummary : copy.list.addSummary}
              </PillButton>
            )}

            <WorkoutLogSets log={log} />
          </>
        )}
      </div>
    </AppShell>
  );
}
