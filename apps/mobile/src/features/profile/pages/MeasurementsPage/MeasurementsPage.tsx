import { useNavigate } from 'react-router-dom';
import { IconPlus } from '@tabler/icons-react';
import { measurementLabel, useCopy, useLanguage } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ROUTES, measurementsLogPath } from '../../../../app/config/routes';
import { bodyCopy } from '../../../bodyTracking/copy';
import { SubScreenHeader } from '../../components/SubScreenHeader/SubScreenHeader';
import { MeasChips } from '../../components/MeasChips/MeasChips';
import { MeasHero } from '../../components/MeasHero/MeasHero';
import { MeasHistory } from '../../components/MeasHistory/MeasHistory';
import { useMeasurementTrend } from '../../hooks/useMeasurementTrend';
import './MeasurementsPage.css';

/**
 * Body measurements over time (PRD §5.5, direction B): the measurement chips, a hero card (latest value,
 * change over the range, the chart) and every day as a card. Opens on `?m=<id>` (tapped on the Profile).
 */
export function MeasurementsPage() {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const navigate = useNavigate();
  const trend = useMeasurementTrend();

  return (
    <AppShell bleed>
      <div className="meas-screen">
        <SubScreenHeader
          title={copy.measurementsTitle}
          fallbackPath={ROUTES.PROFILE}
          action={
            <button type="button" className="meas-log-pill" aria-label={copy.logMeasurements} onClick={() => navigate(measurementsLogPath())}>
              <IconPlus size={16} stroke={3} aria-hidden="true" />
              {copy.logShort}
            </button>
          }
        />

        <div className="meas-content">
          {trend.isLoading && !trend.list && <StateMessage>{copy.loading}</StateMessage>}
          {trend.error && !trend.list && <StateMessage onRetry={trend.reload}>{trend.error}</StateMessage>}

          {trend.list && (
            <>
              <MeasChips ids={trend.ids} value={trend.measurementId} onChange={trend.selectMeasurement} />
              <MeasHero
                title={measurementLabel(trend.measurementId, language)}
                unit={trend.unit}
                latest={trend.latest}
                total={trend.total}
                visible={trend.visible}
                change={trend.change}
                range={trend.range}
                onRange={trend.selectRange}
                tappedIndex={trend.tappedIndex}
                onTap={trend.tap}
                drawKey={`${trend.measurementId}-${trend.range}`}
              />
              <MeasHistory
                days={trend.days}
                ids={trend.ids}
                unit={trend.unit}
                selectedId={trend.measurementId}
                onOpen={(day) => navigate(measurementsLogPath(day.date))}
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
