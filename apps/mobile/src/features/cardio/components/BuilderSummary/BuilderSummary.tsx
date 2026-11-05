import type { CSSProperties } from 'react';
import { cardioKindLabel, cardioMinutes, fill, formatPlural, useCopy, useI18n } from '@sistem/shared';
import type { BuilderSummary as Summary } from '../../data/builderSummary';
import { formatDuration } from '../../data/ownCardioDraft';
import { cardioCopy } from '../../copy';
import './BuilderSummary.css';

interface BuilderSummaryProps {
  summary: Summary;
  selectedId: string | null;
  /** A bar was tapped: open that block. */
  onSelect: (blockId: string) => void;
}

/** The sticky summary: total, block count, the hardest effort + zone, the profile chart (tap a bar = its block). */
export function BuilderSummary({ summary, selectedId, onSelect }: BuilderSummaryProps) {
  const copy = useCopy(cardioCopy).builder;
  const { language } = useI18n();
  // The copy's words around the number; only the number is isolated.
  const [intensityBefore = '', intensityAfter = ''] = copy.maxIntensity.split('{value}');

  return (
    <section className="cb-summary" aria-label={copy.summary}>
      <div className="cb-summary-top">
        <bdi className="cb-summary-total" dir="ltr">
          {cardioMinutes(summary.totalSec)}′
        </bdi>
        <div className="cb-summary-facts">
          <span className="cb-summary-fact">{formatPlural(language, copy.blockCount, summary.blockCount)}</span>
          {summary.maxIntensity > 0 && (
            <>
              <span className="cb-summary-fact">
                {intensityBefore}
                <bdi dir="ltr">{summary.maxIntensity}</bdi>
                {intensityAfter}
              </span>
              <span className="cb-summary-fact cb-summary-zone cp-zone" data-zone={summary.maxZone}>
                <bdi dir="ltr">Z{summary.maxZone}</bdi>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Time runs left → right in both languages (like every chart in the app). */}
      <div className="cb-chart" dir="ltr">
        {summary.bars.map((bar) => (
          <button
            key={bar.key}
            type="button"
            className={'cb-chart-bar cp-zone' + (bar.blockId === selectedId ? ' cb-chart-bar-selected' : '')}
            data-zone={bar.zone}
            style={{ '--cb-w': bar.durationSec, '--cb-h': `${18 + bar.intensity * 8}%` } as CSSProperties}
            aria-label={fill(copy.chartBar, { kind: cardioKindLabel(bar.kind, language), duration: formatDuration(bar.durationSec), intensity: bar.intensity })}
            onClick={() => onSelect(bar.blockId)}
          />
        ))}
      </div>
      <div className="cb-chart-labels" dir="ltr" aria-hidden="true">
        {summary.labels.map((label) => (
          <span
            key={label.stepId}
            className={label.times !== null ? 'cb-chart-label cb-chart-label-repeat' : 'cb-chart-label'}
            style={{ '--cb-w': label.durationSec } as CSSProperties}
          >
            {label.kind ? cardioKindLabel(label.kind, language) : `× ${label.times}`}
          </span>
        ))}
      </div>
    </section>
  );
}
