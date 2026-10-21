import type { BodyMetricList } from '@sistem/types';
import { sharedCopy, todayInTimezone, useCopy } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { useStatsIntro } from '../../../stats/hooks/useStatsIntro';
import { summarizeBody } from '../../data/bodySummary';
import { useBodyMetrics } from '../../hooks/useBodyMetrics';
import { BodyRecordsTable } from '../BodyRecordsTable/BodyRecordsTable';
import { BodySummaryTiles } from '../BodySummaryTiles/BodySummaryTiles';
import { MeasurementsCard } from '../MeasurementsCard/MeasurementsCard';
import { ProgressPhotosCard } from '../ProgressPhotosCard/ProgressPhotosCard';
import { WeightTrendCard } from '../WeightTrendCard/WeightTrendCard';
import './BodyTracking.css';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';

interface BodyTrackingProps {
  traineeId: string;
  traineeName: string;
  /** The trainee's time zone: chart ranges end on her today. */
  timezone: string;
}

/**
 * The Body tab (Phase 10, PRD §6) as a data page: four numbers, her weight trend, her
 * measurements, every record and the progress photos. Read-only, kg / cm.
 */
export function BodyTracking({ traineeId, traineeName, timezone }: BodyTrackingProps) {
  const shared = useCopy(sharedCopy);
  const { list, error, isLoading, reload } = useBodyMetrics(traineeId);

  if (isLoading && !list) return <Skeleton layout="panel" />;
  if (!list) {
    return (
      <p className="body-tracking-message" role="alert">
        {error}{' '}
        <PillButton size="sm" onClick={reload}>
          {shared.common.retry}
        </PillButton>
      </p>
    );
  }
  return <BodyTrackingContent list={list} traineeName={traineeName} timezone={timezone} />;
}

/** Mounted with the data, so the entrance (count-up, line drawing) starts when there is something to show. */
function BodyTrackingContent({ list, traineeName, timezone }: { list: BodyMetricList; traineeName: string; timezone: string }) {
  const intro = useStatsIntro('sistem.trainee.bodyIntroPlayed');
  const today = todayInTimezone(timezone);

  return (
    <div className="body-tracking">
      <BodySummaryTiles summary={summarizeBody(list.items)} intro={intro} />
      <div className="body-tracking-grid">
        <WeightTrendCard metrics={list.items} today={today} intro={intro} />
        <MeasurementsCard metrics={list.items} measurementIds={list.measurementIds} intro={intro} />
        {list.items.length > 0 && <BodyRecordsTable metrics={list.items} measurementIds={list.measurementIds} />}
        <ProgressPhotosCard metrics={list.items} traineeName={traineeName} />
      </div>
    </div>
  );
}
