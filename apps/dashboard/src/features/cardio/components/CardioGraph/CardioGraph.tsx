import type { CSSProperties } from 'react';
import type { CardioMetric } from '@sistem/types';
import {
  type CardioFrame,
  cardioKindLabel,
  cardioMinutes,
  cardioZoneLabel,
  describeCardioTarget,
  formatClock,
  intensityZone,
  useCopy,
  useLanguage,
} from '@sistem/shared';
import { cardioCopy } from '../../copy';
import { barHeight } from '../../data/cardioLabels';
import './CardioGraph.css';

interface CardioGraphProps {
  frames: CardioFrame[];
  totalSec: number;
  metric: CardioMetric;
  selectedId: string | null;
  onSelect: (blockId: string) => void;
}

const AXIS_MARKS = [0, 0.25, 0.5, 0.75, 1];
/** Bars whose middle is this close to an end anchor their tip on that side. */
const EDGE = 0.25;

/**
 * Intensity over the session: one bar per block, its width = its time, its height = its intensity,
 * its color = its zone. A bar opens its block (the others dim); hover / focus shows its tip.
 */
export function CardioGraph({ frames, totalSec, metric, selectedId, onSelect }: CardioGraphProps) {
  const copy = useCopy(cardioCopy);
  const language = useLanguage();

  return (
    <div className="cb-graph-wrap">
      <div className="cb-graph" role="group" aria-label={copy.graphLabel}>
        {frames.map((frame) => {
          const kind = cardioKindLabel(frame.block.kind, language);
          const round = frame.round !== null ? ` ${frame.round}/${frame.rounds}` : '';
          const tip = `${kind}${round} · ${formatClock(frame.block.durationSec)} · ${describeCardioTarget(frame.block.intensity, metric, language).value}`;
          const style = { '--cb-w': frame.block.durationSec, '--cb-h': barHeight(frame.block.intensity) } as CSSProperties;
          // A tip near either end opens inward, so it never leaves the card.
          const middle = totalSec > 0 ? (frame.startSec + frame.block.durationSec / 2) / totalSec : 0.5;
          const edge = middle < EDGE ? 'left' : middle > 1 - EDGE ? 'right' : undefined;
          return (
            <button
              key={frame.index}
              className="cb-graph-bar cb-zone"
              type="button"
              data-zone={intensityZone(frame.block.intensity)}
              data-tip-edge={edge}
              data-dim={selectedId !== null && selectedId !== frame.block.id ? '' : undefined}
              aria-label={tip}
              aria-pressed={selectedId === frame.block.id}
              style={style}
              onClick={() => onSelect(frame.block.id)}
            >
              <span className="cb-graph-tip" aria-hidden="true">
                <bdi dir="auto">{tip}</bdi>
              </span>
            </button>
          );
        })}
      </div>
      <div className="cb-graph-axis" aria-hidden="true">
        {AXIS_MARKS.map((mark) => (
          <span key={mark}>{`${cardioMinutes(totalSec * mark)}′`}</span>
        ))}
      </div>
      <ul className="cb-graph-legend">
        {([1, 2, 3, 4, 5] as const).map((zone) => (
          <li key={zone} className="cb-graph-legend-item cb-zone" data-zone={zone}>
            <i aria-hidden="true" />
            {cardioZoneLabel(zone, language)}
          </li>
        ))}
      </ul>
    </div>
  );
}
