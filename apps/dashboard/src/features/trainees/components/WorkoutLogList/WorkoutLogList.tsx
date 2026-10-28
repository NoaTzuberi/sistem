import { useState } from 'react';
import type { WorkoutLog } from '@sistem/types';
import { formatDateOnly, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { traineesCopy } from '../../copy';
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs';
import { WorkoutLogCard } from '../WorkoutLogCard/WorkoutLogCard';
import { WorkoutLogDayGroup } from '../WorkoutLogDayGroup/WorkoutLogDayGroup';
import { WorkoutLogFilters } from '../WorkoutLogFilters/WorkoutLogFilters';
import { WorkoutLogSummary } from '../WorkoutLogSummary/WorkoutLogSummary';
import './WorkoutLogList.css';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';

interface WorkoutLogListProps {
  traineeId: string;
  /** Her zone: the day a log belongs to and its time. */
  timezone: string;
  /** Her current week's Sunday (for "this week"). */
  currentWeekStart: string;
  /** Another source of her logs (the read-only archive). */
  load?: () => Promise<WorkoutLog[]>;
}

/** The Workout logs tab: four numbers, a filter, and her logs by day — one open at a time. */
export function WorkoutLogList({ traineeId, timezone, currentWeekStart, load }: WorkoutLogListProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const logs = useWorkoutLogs(traineeId, timezone, currentWeekStart, load);
  const [openId, setOpenId] = useState<string | null>(null);

  if (logs.isLoading && !logs.logs) return <Skeleton layout="panel" />;
  if (logs.error && !logs.logs) {
    return (
      <p className="logs-message" role="alert">
        {logs.error}{' '}
        <PillButton size="sm" onClick={logs.reload}>
          {shared.common.retry}
        </PillButton>
      </p>
    );
  }
  if (!logs.logs || logs.logs.length === 0) return <p className="logs-message logs-empty">{shared.coach.noLogs}</p>;

  return (
    <div className="logs">
      <WorkoutLogSummary {...logs.summary} />
      <WorkoutLogFilters value={logs.filter} counts={logs.counts} onChange={logs.setFilter} />
      {logs.days.length === 0 && <p className="logs-message">{copy.logs.noneFiltered}</p>}
      {logs.days.map((day) => (
        <WorkoutLogDayGroup key={day.date} title={formatDateOnly(day.date, language)}>
          {day.logs.map((log) => (
            <WorkoutLogCard key={log.id} log={log} timezone={timezone} isOpen={openId === log.id} onToggle={() => setOpenId((current) => (current === log.id ? null : log.id))} />
          ))}
        </WorkoutLogDayGroup>
      ))}
    </div>
  );
}
