import { useCallback, useMemo, useState } from 'react';
import type { WorkoutLog } from '@sistem/types';
import { getActiveLanguage, sharedCopy, useLoad } from '@sistem/shared';
import { listTraineeWorkoutLogs } from '../../../services/coach/coachService';

export type LogFilter = 'all' | 'prs' | 'photo';
export type LogState = 'done' | 'partial' | 'in_progress';

/** 'YYYY-MM-DD' of an instant in her time zone (the day a workout belongs to). */
export function dayIn(iso: string, timezone: string): string {
  // en-CA writes dates as YYYY-MM-DD; only the digits are used, never shown. i18n-ignore
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

/** Finished with every set done · finished with some sets not done · still open. */
export function logState(log: WorkoutLog): LogState {
  if (log.status !== 'completed') return 'in_progress';
  return log.sets.some((set) => !set.completed) ? 'partial' : 'done';
}

const hasPr = (log: WorkoutLog) => (log.personalRecords?.length ?? 0) > 0;

/**
 * Her workout logs (newest first, as the server sends them): the four summary numbers, the
 * filter counts, and the filtered logs grouped by her day.
 */
export function useWorkoutLogs(traineeId: string, timezone: string, currentWeekStart: string, loadLogs?: () => Promise<WorkoutLog[]>) {
  // loadLogs = another source (the read-only archive); default = the live coaching's logs.
  const load = useCallback(() => (loadLogs ? loadLogs() : listTraineeWorkoutLogs(traineeId)), [loadLogs, traineeId]);
  const { data, error, isLoading, reload } = useLoad(load, sharedCopy[getActiveLanguage()].coach.logsLoadError);
  const [filter, setFilter] = useState<LogFilter>('all');

  const view = useMemo(() => {
    const logs = data ?? [];
    const rated = logs.flatMap((log) => (log.rating === undefined ? [] : [log.rating]));
    const filtered = logs.filter((log) => (filter === 'prs' ? hasPr(log) : filter === 'photo' ? log.pumpPhoto !== null : true));
    const days: { date: string; logs: WorkoutLog[] }[] = [];
    for (const log of filtered) {
      const date = dayIn(log.startedAt, timezone);
      const last = days[days.length - 1];
      if (last?.date === date) last.logs.push(log);
      else days.push({ date, logs: [log] });
    }
    return {
      summary: {
        count: logs.length,
        thisWeek: logs.filter((log) => dayIn(log.startedAt, timezone) >= currentWeekStart).length,
        averageRating: rated.length > 0 ? rated.reduce((sum, rating) => sum + rating, 0) / rated.length : null,
        records: logs.reduce((sum, log) => sum + (log.personalRecords?.length ?? 0), 0),
      },
      counts: { all: logs.length, prs: logs.filter(hasPr).length, photo: logs.filter((log) => log.pumpPhoto !== null).length },
      days,
    };
  }, [data, filter, timezone, currentWeekStart]);

  return { logs: data, error, isLoading, reload, filter, setFilter, ...view };
}
