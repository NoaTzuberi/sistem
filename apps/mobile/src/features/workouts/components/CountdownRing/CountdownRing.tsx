import type { ReactNode } from 'react';
import { useCountdownRing } from '../../hooks/useCountdownRing';
import './CountdownRing.css';

interface CountdownRingProps {
  /** Device clock (ms) when the phase ends; null while paused. */
  endsAt: number | null;
  pausedRemainingMs: number | null;
  durationMs: number;
  /** The clock in the middle. */
  children: ReactNode;
}

const SIZE = 264;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const LENGTH = 2 * Math.PI * RADIUS;

/** The interval run's ring (the rest-sheet ring, bigger): it drains with the time left. */
export function CountdownRing({ endsAt, pausedRemainingMs, durationMs, children }: CountdownRingProps) {
  const ringRef = useCountdownRing(endsAt, pausedRemainingMs, durationMs, LENGTH);
  return (
    <div className="countdown-ring">
      {/* Starts at the top and drains clockwise; the ring reads the same in both directions. */}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="countdown-ring-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
        <circle ref={ringRef} className="countdown-ring-value" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeDasharray={LENGTH} />
      </svg>
      <div className="countdown-ring-center">{children}</div>
    </div>
  );
}
