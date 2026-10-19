import { IconChevronRight, IconPlus } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { workoutCopy } from '../../copy';
import './FreeWorkoutEntry.css';

/** "Want to move more?" — opens the free-workout sheet. */
export function FreeWorkoutEntry({ onOpen }: { onOpen: () => void }) {
  const copy = useCopy(workoutCopy);
  return (
    <button type="button" className="free-workout-entry" onClick={onOpen}>
      <span className="free-workout-entry-icon" aria-hidden="true">
        <IconPlus size={24} stroke={2} />
      </span>
      <span className="free-workout-entry-text">
        <span className="free-workout-entry-title display-title">{copy.screen.freeWorkout}</span>
        <span className="free-workout-entry-note">{copy.plan.freeEntryText}</span>
      </span>
      <span className="free-workout-entry-arrow" aria-hidden="true">
        <IconChevronRight className="flip-rtl" size={16} stroke={2} />
      </span>
    </button>
  );
}
