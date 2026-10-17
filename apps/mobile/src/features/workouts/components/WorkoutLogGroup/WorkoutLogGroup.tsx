import { fill, formatPlural, formatWeekSpan, useCopy, useLanguage } from '@sistem/shared';
import { formatTotalTime, type LogWeekGroup } from '../../data/historyDisplay';
import { WorkoutLogRow } from '../WorkoutLogRow/WorkoutLogRow';
import { workoutCopy } from '../../copy';
import './WorkoutLogGroup.css';

interface WorkoutLogGroupProps {
  group: LogWeekGroup;
  /** Her current week's Sunday: that group reads "This week". */
  currentWeekStart: string;
  timeZone: string;
}

/** One plan week of the log: "This week" / "Oct 4 – 10", how many workouts and the total time. */
export function WorkoutLogGroup({ group, currentWeekStart, timeZone }: WorkoutLogGroupProps) {
  const copy = useCopy(workoutCopy);
  const language = useLanguage();
  const title = group.weekStartDate === currentWeekStart ? copy.history.thisWeek : formatWeekSpan(group.weekStartDate, language);
  const titleId = `log-week-${group.weekStartDate}`;
  return (
    <section className="workout-log-group" aria-labelledby={titleId}>
      <h3 className="workout-log-group-head">
        <span id={titleId}>{title}</span>
        <span className="workout-log-group-summary">
          {fill(copy.history.groupSummary, {
            count: formatPlural(language, copy.history.workoutCount, group.items.length),
            time: formatTotalTime(group.totalSec, language),
          })}
        </span>
      </h3>
      <ul className="workout-log-group-list">
        {group.items.map((item) => (
          <li key={item.log.id}>
            <WorkoutLogRow item={item} timeZone={timeZone} />
          </li>
        ))}
      </ul>
    </section>
  );
}
