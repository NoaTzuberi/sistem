import { IconStopwatch } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { formatClock } from '../../../workouts/data/workoutDisplay';
import { homeCopy } from '../../copy';
import './IntervalTimerEntry.css';

interface IntervalTimerEntryProps {
  /** Seconds of work she last set on this device; null = never used here (not shown). */
  lastWorkSec: number | null;
  onOpen: () => void;
}

/** The ink bar that opens the free interval timer (logs nothing). */
export function IntervalTimerEntry({ lastWorkSec, onOpen }: IntervalTimerEntryProps) {
  const copy = useCopy(homeCopy);
  return (
    <button type="button" className="interval-timer-entry" onClick={onOpen}>
      <IconStopwatch size={20} stroke={2} aria-hidden="true" />
      <span className="interval-timer-entry-label">{copy.intervalTimer}</span>
      {lastWorkSec !== null && (
        <span className="interval-timer-entry-last" dir="ltr">
          {formatClock(lastWorkSec).padStart(5, '0')}
        </span>
      )}
    </button>
  );
}
