import { useState } from 'react';
import { useCopy } from '@sistem/shared';
import { IconPlus } from '@tabler/icons-react';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ROUTES } from '../../../../app/config/routes';
import { bodyCopy } from '../../../bodyTracking/copy';
import { SubScreenHeader } from '../../components/SubScreenHeader/SubScreenHeader';
import { MeasHero } from '../../components/MeasHero/MeasHero';
import { WeightHistoryCards } from '../../components/WeightHistoryCards/WeightHistoryCards';
import { WeightLogSheet } from '../../components/WeightLogSheet/WeightLogSheet';
import type { WeightSheetTarget } from '../../components/WeightLogSheet/WeightLogSheet';
import { useWeightTrend } from '../../hooks/useWeightTrend';
import './WeightPage.css';

// Body weight over time (PRD §5.5, direction B — the measurements screen's parts): the hero card with the
// chart, every weigh-in as a card; log / edit / delete in the weight sheet.
export function WeightPage() {
  const copy = useCopy(bodyCopy);
  const trend = useWeightTrend();
  const { list, error, isLoading, reload, applyDay } = trend.body;
  const [sheet, setSheet] = useState<WeightSheetTarget | null>(null);

  return (
    <AppShell bleed surface="soft">
      <div className="wt-screen">
        <SubScreenHeader
          title={copy.weightTitle}
          fallbackPath={ROUTES.PROFILE}
          action={
            <button type="button" className="wt-log-pill" aria-label={copy.logWeight} disabled={!list} onClick={() => setSheet({ date: trend.today })}>
              <IconPlus size={16} stroke={3} aria-hidden="true" />
              {copy.logShort}
            </button>
          }
        />

        <div className="wt-content">
          {isLoading && !list && <StateMessage>{copy.loading}</StateMessage>}
          {error && !list && <StateMessage onRetry={reload}>{error}</StateMessage>}

          {list && (
            <>
              <MeasHero
                title={copy.weightTitle}
                unit={trend.unit}
                latest={trend.latest}
                total={trend.total}
                visible={trend.visible}
                change={trend.change}
                range={trend.range}
                onRange={trend.selectRange}
                tappedIndex={trend.tappedIndex}
                onTap={trend.tap}
                drawKey={trend.range}
                emptyText={copy.noWeight}
              />
              <WeightHistoryCards metrics={list.items} unit={trend.unit} onEdit={(metric) => setSheet({ date: metric.date, weight: metric.weight })} />
            </>
          )}
        </div>

        {sheet && <WeightLogSheet target={sheet} today={trend.today} unit={trend.unit} onClose={() => setSheet(null)} onSaved={applyDay} />}
      </div>
    </AppShell>
  );
}
