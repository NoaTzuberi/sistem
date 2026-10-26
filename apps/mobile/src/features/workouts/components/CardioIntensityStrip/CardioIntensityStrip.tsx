import type { CSSProperties } from 'react';
import type { CardioProfileSegment } from '../../../cardio/hooks/useCardioProfile';
import '../../../cardio/cardioZones.css';
import './CardioIntensityStrip.css';

interface CardioIntensityStripProps {
  segments: CardioProfileSegment[];
  label: string;
}

/** A cardio session's shape on a ticket: one segment per block, width = its time, color = its zone. */
export function CardioIntensityStrip({ segments, label }: CardioIntensityStripProps) {
  return (
    <span className="cardio-strip" role="img" aria-label={label}>
      {segments.map((segment) => (
        <span
          key={segment.key}
          className="cardio-strip-segment cp-zone"
          data-zone={segment.zone}
          style={{ '--strip-grow': segment.durationSec } as CSSProperties}
        />
      ))}
    </span>
  );
}
