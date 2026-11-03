import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { LengthUnit } from '@sistem/types';
import { formatChartDate, formatNumber, unitLabel, useLanguage } from '@sistem/shared';
import type { ChartPoint } from '@sistem/shared';
import { MEAS_CHART_HEIGHT, useMeasChart } from '../../hooks/useMeasChart';
import './MeasChart.css';

interface MeasChartProps {
  points: ChartPoint[];
  unit: LengthUnit;
  ariaLabel: string;
  tappedIndex: number | null;
  onTap: (index: number | null) => void;
  /** Changes with the range / measurement: the line draws itself in again. */
  drawKey: string;
}

// Past this many points the dots crowd the line: only the latest (and the tapped one) are drawn.
const MAX_DOTS = 40;

/** The pink line over a soft pink area; tap or drag → a tooltip pill with the value + date. */
export function MeasChart({ points, unit, ariaLabel, tappedIndex, onTap, drawKey }: MeasChartProps) {
  const language = useLanguage();
  const gradientId = useId();
  const { boxRef, width, geometry, tapped, handlers } = useMeasChart(points, tappedIndex, onTap);
  const latest = geometry?.points[geometry.points.length - 1];

  return (
    <div className="meas-chart" ref={boxRef}>
      {geometry && (
        <svg
          direction="ltr"
          className="meas-chart-svg"
          width={width}
          height={MEAS_CHART_HEIGHT}
          viewBox={`0 0 ${width} ${MEAS_CHART_HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          {...handlers}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="meas-chart-area-top" />
              <stop offset="1" className="meas-chart-area-bottom" />
            </linearGradient>
          </defs>
          {geometry.yTicks.map((tick) => (
            <g key={tick.value}>
              <line className="meas-chart-grid" x1={geometry.plot.left} x2={geometry.plot.right} y1={tick.y} y2={tick.y} />
              <text className="meas-chart-axis" x={geometry.plot.left - 8} y={tick.y} textAnchor="end" dominantBaseline="middle">
                {formatNumber(tick.value, language)}
              </text>
            </g>
          ))}
          {geometry.xTicks.map((tick, index) => (
            <text
              key={index}
              className="meas-chart-axis"
              x={tick.x}
              y={MEAS_CHART_HEIGHT - 6}
              textAnchor={index === 0 ? 'start' : index === geometry.xTicks.length - 1 ? 'end' : 'middle'}
            >
              {tick.label}
            </text>
          ))}
          <g key={drawKey}>
            <path className="meas-chart-area" d={geometry.area} fill={`url(#${gradientId})`} />
            <path className="meas-chart-line" d={geometry.line} pathLength={1} />
          </g>
          {tapped && <line className="meas-chart-crosshair" x1={tapped.x} x2={tapped.x} y1={geometry.plot.top} y2={geometry.plot.bottom} />}
          {geometry.points.length <= MAX_DOTS &&
            geometry.points.slice(0, -1).map((point) => <circle key={point.date} className="meas-chart-dot" cx={point.x} cy={point.y} r={3} />)}
          {latest && <circle className="meas-chart-dot meas-chart-dot-latest" cx={latest.x} cy={latest.y} r={6} />}
          {tapped && tapped !== latest && <circle className="meas-chart-dot meas-chart-dot-tapped" cx={tapped.x} cy={tapped.y} r={5} />}
        </svg>
      )}
      {geometry && tapped && (
        <p
          className="meas-chart-tip"
          aria-live="polite"
          // Pinned over the tapped point: x from the chart's left edge (time runs left → right in both languages).
          style={{ '--meas-tip-x': `${tapped.x}px`, '--meas-tip-y': `${tapped.y}px` } as CSSProperties}
        >
          <span className="meas-chart-tip-value">
            <bdi dir="ltr">{formatNumber(tapped.value, language)}</bdi> {unitLabel(unit, language)}
          </span>
          <span className="meas-chart-tip-date">{formatChartDate(tapped.date, language)}</span>
        </p>
      )}
    </div>
  );
}
