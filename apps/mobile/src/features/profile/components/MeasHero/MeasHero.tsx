import type { LengthUnit, WeightUnit } from '@sistem/types';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { CHART_RANGES, chartRangeLabel, fill, formatChartDate, formatDateOnly, formatNumber, roundOneDecimal, unitLabel, useCopy, useLanguage } from '@sistem/shared';
import type { ChartPoint, ChartRange } from '@sistem/shared';
import { bodyCopy } from '../../../bodyTracking/copy';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl';
import { MeasChart } from '../MeasChart/MeasChart';
import './MeasHero.css';

interface MeasHeroProps {
  title: string;
  unit: LengthUnit | WeightUnit;
  latest: ChartPoint | null;
  total: number;
  visible: ChartPoint[];
  change: number | null;
  range: ChartRange;
  onRange: (range: ChartRange) => void;
  tappedIndex: number | null;
  onTap: (index: number | null) => void;
  drawKey: string;
  /** The line when there is nothing yet (default: no measurements). */
  emptyText?: string;
}

/** The change pill: down = cherry tint + down arrow, up = soft grey + up arrow. No judgment words. */
function ChangePill({ change, unit }: { change: number; unit: LengthUnit | WeightUnit }) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const rounded = roundOneDecimal(change);
  const number = formatNumber(Math.abs(rounded), language);
  const amount = `${number} ${unitLabel(unit, language)}`;
  const tone = rounded < 0 ? 'down' : rounded > 0 ? 'up' : 'flat';
  const label = tone === 'down' ? fill(copy.changeDown, { amount }) : tone === 'up' ? fill(copy.changeUp, { amount }) : amount;
  return (
    <span className={`meas-change meas-change-${tone}`}>
      {tone === 'down' && <IconArrowDown size={14} stroke={2.5} aria-hidden="true" />}
      {tone === 'up' && <IconArrowUp size={14} stroke={2.5} aria-hidden="true" />}
      <span className="meas-sr-only">{label} </span>
      <span className="meas-change-amount" aria-hidden="true">
        <bdi dir="ltr">{number}</bdi> {unitLabel(unit, language)}
      </span>
      <span className="meas-change-range">{copy.rangeChange}</span>
    </span>
  );
}

/** The white hero card: the latest value, its date, the change over the range, the range control, the chart. */
export function MeasHero({ title, unit, latest, total, visible, change, range, onRange, tappedIndex, onTap, drawKey, emptyText }: MeasHeroProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);

  if (!latest) {
    return (
      <section className="meas-hero" aria-label={title}>
        <p className="meas-hero-note">{emptyText ?? copy.noMeasurements}</p>
      </section>
    );
  }

  return (
    <section className="meas-hero" aria-label={fill(copy.chartLabel, { what: title })}>
      <div className="meas-hero-readout">
        <p className="meas-hero-value">
          <bdi dir="ltr">
            <span className="meas-hero-number">{formatNumber(latest.value, language)}</span>
            <span className="meas-hero-unit">{unitLabel(unit, language)}</span>
          </bdi>
        </p>
        <p className="meas-hero-date">{formatDateOnly(latest.date, language)}</p>
        {change !== null && <ChangePill change={change} unit={unit} />}
      </div>

      {total >= 2 && (
        <SegmentedControl
          block
          label={copy.rangeLabel}
          options={CHART_RANGES.map((option) => ({ value: option, label: chartRangeLabel(option, language) }))}
          value={range}
          onChange={onRange}
        />
      )}

      {total < 2 ? (
        <p className="meas-hero-note">{copy.chartOneMore}</p>
      ) : visible.length < 2 ? (
        <p className="meas-hero-note">{copy.chartEmpty}</p>
      ) : (
        <MeasChart
          points={visible}
          unit={unit}
          ariaLabel={`${fill(copy.chartLabel, { what: title })}, ${formatChartDate(visible[0].date, language)} – ${formatChartDate(latest.date, language)}`}
          tappedIndex={tappedIndex}
          onTap={onTap}
          drawKey={drawKey}
        />
      )}
    </section>
  );
}
