import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_UNITS, measurementDays, measurementLabel, measurementPoints, todayInTimezone, useCopy, useLanguage, weightPoints } from '@sistem/shared';
import { listTraineeBodyMetrics } from '../../../../services/coach/coachService';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useBodyMetrics } from '../../../bodyTracking/hooks/useBodyMetrics';
import { ProgressPhotoGallery } from '../../../bodyTracking/components/ProgressPhotoGallery/ProgressPhotoGallery';
import { PhotoCompare } from '../../../bodyTracking/components/PhotoCompare/PhotoCompare';
import { bodyCopy } from '../../../bodyTracking/copy';
import { MeasHero } from '../../../profile/components/MeasHero/MeasHero';
import { MeasChips } from '../../../profile/components/MeasChips/MeasChips';
import { MeasHistory } from '../../../profile/components/MeasHistory/MeasHistory';
import { WeightHistoryCards } from '../../../profile/components/WeightHistoryCards/WeightHistoryCards';
import { useTraineeBodyTrend } from '../../hooks/useTraineeBodyTrend';
import './TraineeBodyTracking.css';

interface TraineeBodyTrackingProps {
  traineeId: string;
  /** The trainee's time zone: chart ranges end on her today. */
  timezone: string;
}

/**
 * The Body tab (coach mode): her weight, measurements and progress photos with her own screens' parts
 * (hero + chart, history cards, photo compare), read-only, always in kg / cm.
 */
export function TraineeBodyTracking({ traineeId, timezone }: TraineeBodyTrackingProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const load = useCallback(() => listTraineeBodyMetrics(traineeId), [traineeId]);
  const { list, error, isLoading, reload } = useBodyMetrics(load, copy.coachLoadError);
  const [picked, setPicked] = useState<string | null>(null);
  const units = DEFAULT_UNITS;
  const today = todayInTimezone(timezone);

  const items = useMemo(() => list?.items ?? [], [list]);
  const ids = list?.measurementIds ?? [];
  const days = useMemo(() => measurementDays(items), [items]);
  const firstLogged = ids.find((id) => days.some((day) => day.measurements[id] !== undefined));
  const measurementId = (picked && ids.includes(picked) ? picked : null) ?? firstLogged ?? ids[0] ?? '';

  const weightSeries = useMemo(() => weightPoints(items, units.weight), [items, units.weight]);
  const measurementSeries = useMemo(
    () => (measurementId ? measurementPoints(items, measurementId, units.length) : []),
    [items, measurementId, units.length],
  );
  const weight = useTraineeBodyTrend(weightSeries, today);
  const measurement = useTraineeBodyTrend(measurementSeries, today, measurementId);

  if (isLoading && !list) return <StateMessage>{copy.loading}</StateMessage>;
  if (!list) return <StateMessage onRetry={reload}>{error}</StateMessage>;

  return (
    <div className="trainee-body-tracking">
      <section className="trainee-body-tracking-section" aria-labelledby="trainee-body-weight">
        <h2 className="trainee-body-tracking-title display-title" id="trainee-body-weight">
          {copy.weightTitle}
        </h2>
        <MeasHero
          title={copy.weightTitle}
          unit={units.weight}
          latest={weight.latest}
          total={weight.total}
          visible={weight.visible}
          change={weight.change}
          range={weight.range}
          onRange={weight.selectRange}
          tappedIndex={weight.tappedIndex}
          onTap={weight.tap}
          drawKey={`weight-${weight.range}`}
          emptyText={copy.noWeight}
        />
        <WeightHistoryCards metrics={items} unit={units.weight} />
      </section>

      <section className="trainee-body-tracking-section" aria-labelledby="trainee-body-measurements">
        <h2 className="trainee-body-tracking-title display-title" id="trainee-body-measurements">
          {copy.measurementsTitle}
        </h2>
        <MeasChips ids={ids} value={measurementId} onChange={setPicked} />
        <MeasHero
          title={measurementLabel(measurementId, language)}
          unit={units.length}
          latest={measurement.latest}
          total={measurement.total}
          visible={measurement.visible}
          change={measurement.change}
          range={measurement.range}
          onRange={measurement.selectRange}
          tappedIndex={measurement.tappedIndex}
          onTap={measurement.tap}
          drawKey={`${measurementId}-${measurement.range}`}
        />
        <MeasHistory days={days} ids={ids} unit={units.length} selectedId={measurementId} />
      </section>

      <section className="trainee-body-tracking-section" aria-labelledby="trainee-body-photos">
        <h2 className="trainee-body-tracking-title display-title" id="trainee-body-photos">
          {copy.photosTitle}
        </h2>
        <PhotoCompare metrics={items} weightUnit={units.weight} onLinkExpired={reload} />
        <ProgressPhotoGallery metrics={items} onLinkExpired={reload} />
      </section>
    </div>
  );
}
