import { IconLock } from '@tabler/icons-react';
import { formatWeekRange, useCopy, useLanguage } from '@sistem/shared';
import type { PlannedWorkout } from '../../data/weekPlanDisplay';
import { WorkoutTicket } from '../WorkoutTicket/WorkoutTicket';
import { workoutCopy } from '../../copy';
import './NextWeekLock.css';

interface NextWeekLockProps {
  weekStartDate: string;
  /** Next week's first workout when the coach has published it; null = not published yet (locked). */
  firstWorkout: PlannedWorkout | null;
  onOpen: (planned: PlannedWorkout) => void;
}

/** Next week: locked until the coach publishes it, then its first workout. */
export function NextWeekLock({ weekStartDate, firstWorkout, onOpen }: NextWeekLockProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  const range = formatWeekRange(weekStartDate, language);

  if (firstWorkout) {
    return (
      <div className="next-week">
        <p className="next-week-range">{range}</p>
        <div className="next-week-ticket">
          <WorkoutTicket planned={firstWorkout} onOpen={() => onOpen(firstWorkout)} />
        </div>
      </div>
    );
  }

  return (
    <div className="next-week-lock">
      <span className="next-week-lock-icon" aria-hidden="true">
        <IconLock size={18} stroke={2} />
      </span>
      <div className="next-week-lock-text">
        <span className="next-week-lock-title">{range}</span>
        <span className="next-week-lock-note">{copy.plan.nextWeekLocked}</span>
      </div>
    </div>
  );
}
