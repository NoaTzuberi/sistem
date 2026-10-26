import type { BodyMetric } from '@sistem/types';
import { formatNumber, isolateLtr, latestMeasurements, measurementLabel, useCopy, useLanguage, weighIns } from '@sistem/shared';
import { coachCopy } from '../../copy';
import './BodyScoreboard.css';

/** Two measurements next to the weight (waist, hips when she logs them — else the first ones she logged). */
const PREFERRED = ['waist', 'hips'];
const SHOWN_MEASUREMENTS = 2;

interface BodyScoreboardProps {
  metrics: BodyMetric[];
  measurementIds: string[];
}

interface Cell {
  id: string;
  value: number;
  label: string;
  /** Against her first entry; null when there is only one. */
  delta: number | null;
}

/**
 * Weight + two measurements, each with its change since her first entry. The coach always reads kg / cm.
 * A decrease is Cherry, an increase purple — identity colors, never good / bad (no green).
 */
export function BodyScoreboard({ metrics, measurementIds }: BodyScoreboardProps) {
  const copy = useCopy(coachCopy);
  const language = useLanguage();
  const cells: Cell[] = [];

  const weights = weighIns(metrics);
  if (weights.length > 0) {
    const first = weights[weights.length - 1].weight;
    cells.push({ id: 'weight', value: weights[0].weight, label: copy.detail.weight, delta: weights.length > 1 ? weights[0].weight - first : null });
  }
  const order = [...PREFERRED.filter((id) => measurementIds.includes(id)), ...measurementIds.filter((id) => !PREFERRED.includes(id))];
  for (const latest of latestMeasurements(metrics, order).slice(0, SHOWN_MEASUREMENTS)) {
    const oldest = [...metrics].reverse().find((metric) => metric.measurements[latest.id] !== undefined);
    const delta = oldest && oldest.date !== latest.date ? latest.cm - oldest.measurements[latest.id] : null;
    cells.push({ id: latest.id, value: latest.cm, label: measurementLabel(latest.id, language), delta });
  }

  if (cells.length === 0) return <p className="coach-card-text">{copy.detail.noMeasurements}</p>;

  return (
    <dl className="body-scoreboard">
      {cells.map((cell) => (
        <div key={cell.id} className="body-scoreboard-cell">
          {/* The label comes first for screen readers; CSS shows the number above it. */}
          <dt className="body-scoreboard-label">{cell.label}</dt>
          <dd className="body-scoreboard-value">{formatNumber(cell.value, language, { maximumFractionDigits: 1 })}</dd>
          {cell.delta !== null && Math.abs(cell.delta) >= 0.05 && (
            <dd className={'body-scoreboard-delta' + (cell.delta < 0 ? ' body-scoreboard-delta-down' : '')}>
              {isolateLtr(`${cell.delta < 0 ? '−' : '+'}${formatNumber(Math.abs(cell.delta), language, { maximumFractionDigits: 1 })}`)}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
