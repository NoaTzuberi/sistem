import { IconLock } from '@tabler/icons-react';
import type { TraineeLockedWeek } from '@sistem/types';
import { fill, formatDayMonth, formatWeekSpan, useCopy, useI18n } from '@sistem/shared';
import { workoutCopy } from '../../copy';
import './LockedBlockWeeks.css';

interface LockedBlockWeeksProps {
  weeks: TraineeLockedWeek[];
  /** The Sunday that starts next week: that week "opens on Sunday", later ones on their date. */
  nextWeekStartDate: string;
}

/** The later weeks of her multi-week plan: locked and muted until their Sunday (nothing to open yet). */
export function LockedBlockWeeks({ weeks, nextWeekStartDate }: LockedBlockWeeksProps) {
  const copy = useCopy(workoutCopy).block;
  const { language, plural } = useI18n();
  return (
    <ul className="locked-weeks">
      {weeks.map((week) => (
        <li key={week.weekStartDate} className="locked-week">
          <span className="locked-week-icon" aria-hidden="true">
            <IconLock size={18} stroke={2} />
          </span>
          <span className="locked-week-text">
            <span className="locked-week-title">{fill(copy.lockedWeek, { n: week.week, range: formatWeekSpan(week.weekStartDate, language) })}</span>
            <span className="locked-week-meta">
              {week.isDeload && `${copy.lightWeekTag} · `}
              {plural(copy.workouts, week.workoutCount)}
            </span>
          </span>
          <span className="locked-week-opens">
            {week.weekStartDate === nextWeekStartDate ? copy.opensSunday : fill(copy.opensOn, { date: formatDayMonth(week.weekStartDate, language) })}
          </span>
        </li>
      ))}
    </ul>
  );
}
