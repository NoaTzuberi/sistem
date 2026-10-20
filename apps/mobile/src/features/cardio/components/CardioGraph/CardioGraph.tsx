import type { CSSProperties } from 'react';
import { type CardioFrame, cardioMinutes, intensityZone } from '@sistem/shared';
import './CardioGraph.css';

interface CardioGraphProps {
  frames: CardioFrame[];
  totalSec: number;
}

/** The session's shape: a bar per block (width = time, height = intensity, color = zone), growing in one by one. */
export function CardioGraph({ frames, totalSec }: CardioGraphProps) {
  const marks = [0, 0.5, 1].map((mark) => `${cardioMinutes(totalSec * mark)}′`);
  return (
    <div className="cp-graph-wrap" aria-hidden="true">
      <div className="cp-graph">
        {frames.map((frame) => (
          <i
            key={frame.index}
            className="cp-graph-bar cp-zone"
            data-zone={intensityZone(frame.block.intensity)}
            style={{ '--cp-w': frame.block.durationSec, '--cp-h': `${18 + frame.block.intensity * 8}%`, '--cp-i': frame.index } as CSSProperties}
          />
        ))}
      </div>
      <div className="cp-graph-axis">
        {marks.map((mark, index) => (
          <span key={index}>{mark}</span>
        ))}
      </div>
    </div>
  );
}
