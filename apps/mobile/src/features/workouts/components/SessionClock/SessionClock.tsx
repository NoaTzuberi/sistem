import { useEffect, useState } from 'react';
import { formatClock } from '../../data/workoutDisplay';
import './SessionClock.css';

interface SessionClockProps {
  /** Server time the session started. */
  startedAt: string;
  /** server clock − device clock, measured when the session loaded. */
  serverOffsetMs: number;
  /** Accessible name of the timer ("Workout time"). */
  label: string;
  className?: string;
}

/**
 * Time since the workout started, on the server's clock (PRD §11) — computed from the start time on
 * every tick, so it is right again the moment a locked phone wakes. Its own component so only it
 * re-renders every second.
 */
export function SessionClock({ startedAt, serverOffsetMs, label, className }: SessionClockProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedSec = (now + serverOffsetMs - new Date(startedAt).getTime()) / 1000;
  return (
    <span className={['session-clock', className].filter(Boolean).join(' ')} role="timer" aria-label={label} dir="ltr">
      {formatClock(elapsedSec)}
    </span>
  );
}
