import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { WeightUnit } from '@sistem/types';
import type { ChartPoint } from '@sistem/shared';
import { IconPlus } from '@tabler/icons-react';
import { directionOf, fill, formatDayMonth, roundOneDecimal, unitLabel, useCopy, useLanguage } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { ROUTES } from '../../../../app/config/routes';
import { buildMiniChart, memberWeek, padWeek } from '../../data/profileDisplay';
import type { WeightRange } from '../../hooks/useMeasurements';
import { profileCopy } from '../../copy';
import './WeightCard.css';

// The chart's drawing box (stretched to the card's width; the line keeps its stroke width).
const CHART = { width: 320, height: 90 };
// Value room above and below the line, in her unit.
const CHART_PAD = 0.3;

interface WeightCardProps {
  weight: {
    all: ChartPoint[];
    visible: ChartPoint[];
    change: number | null;
    latest: { date: string; value: number } | null;
  } | null;
  unit: WeightUnit;
  range: WeightRange;
  onRangeChange: (range: WeightRange) => void;
  joinDate: string | null;
  onUpdate: () => void;
}

/** A signed number, left to right: '−1.8', '+0.4', '0'. */
function signed(value: number): string {
  const rounded = roundOneDecimal(value);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}`;
}

/** The ink weight card: her latest weight, the change over the range, the line, the range chips, "update". */
export function WeightCard({ weight, unit, range, onRangeChange, joinDate, onUpdate }: WeightCardProps) {
  const copy = useCopy(profileCopy);
  const language = useLanguage();
  const rtl = directionOf(language) === 'rtl';
  const unitText = unitLabel(unit, language);
  const latest = weight?.latest ?? null;
  const visible = weight?.visible ?? [];
  const chart = buildMiniChart(visible, CHART, rtl, CHART_PAD);
  const startWeek = joinDate && visible[0] ? padWeek(memberWeek(joinDate, visible[0].date)) : null;

  return (
    <div className="pf-weight">
      <div className="pf-weight-head">
        <div className="pf-weight-now">
          <Eyebrow keepInEnglish>{fill(copy.eyebrow.weight, { unit: unit.toUpperCase() })}</Eyebrow>
          {latest ? (
            <>
              <p className="pf-weight-value">
                <bdi className="pf-weight-number" dir="ltr">
                  {roundOneDecimal(latest.value)}
                </bdi>
                <span className="pf-weight-unit">{unitText}</span>
              </p>
              <p className="pf-weight-updated">{fill(copy.weightUpdated, { date: formatDayMonth(latest.date, language) })}</p>
            </>
          ) : (
            <p className="pf-weight-updated">{copy.noEntries}</p>
          )}
        </div>
        {weight?.change !== null && weight?.change !== undefined && (
          <p className="pf-delta">
            <span className="pf-sr-only">{copy.weightChange} </span>
            <bdi dir="ltr">{signed(weight.change)}</bdi> {unitText}
          </p>
        )}
      </div>

      {chart && (
        // Keyed by the range: the line draws itself again when the range changes.
        <figure
          key={range}
          className="pf-chart"
          role="img"
          aria-label={fill(copy.chartLabel, { from: formatDayMonth(visible[0].date, language), to: formatDayMonth(visible[visible.length - 1].date, language) })}
        >
          <div className="pf-chart-plot">
            <svg className="pf-chart-svg" viewBox={`0 0 ${CHART.width} ${CHART.height}`} preserveAspectRatio="none" aria-hidden="true">
              <path className="pf-chart-area" d={chart.area} />
              <path className="pf-chart-line" d={chart.line} vectorEffect="non-scaling-stroke" />
            </svg>
            {/* An HTML dot: the stretched SVG would draw an ellipse. Physical left: the chart's x is computed per direction. */}
            <span
              className="pf-chart-dot"
              style={{ '--pf-dot-x': `${chart.last.x * 100}%`, '--pf-dot-y': `${chart.last.y * 100}%` } as CSSProperties}
            />
          </div>
          <div className="pf-chart-axis" aria-hidden="true">
            <span>{range === 'month' ? copy.eyebrow.chartMonth : fill(copy.eyebrow.chartStart, { week: startWeek ?? '01' })}</span>
            <span>{copy.eyebrow.chartNow}</span>
          </div>
        </figure>
      )}

      {weight && weight.all.length >= 2 && (
        <div className="pf-range" role="group" aria-label={copy.rangeLabel}>
          <button type="button" className="pf-range-chip" aria-pressed={range === 'month'} onClick={() => onRangeChange('month')}>
            {copy.rangeMonth}
          </button>
          <button type="button" className="pf-range-chip" aria-pressed={range === 'all'} onClick={() => onRangeChange('all')}>
            {copy.rangeAll}
          </button>
          <Link className="pf-weight-history" to={ROUTES.PROFILE_WEIGHT}>
            {copy.weightHistory}
          </Link>
        </div>
      )}

      <button type="button" className="pf-cta" onClick={onUpdate}>
        <IconPlus size={18} aria-hidden="true" />
        {copy.updateMeasurement}
      </button>
    </div>
  );
}
