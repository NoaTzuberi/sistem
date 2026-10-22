import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopy, useLoad } from '@sistem/shared';
import { useAuth } from '../../../services/auth/AuthContext';
import { listPlans } from '../../../services/plans/plansService';
import { listWorkoutLogs } from '../../../services/workoutLogs/workoutLogsService';
import {
  addMonths,
  buildMonthGrid,
  groupByWeek,
  matchesFilter,
  monthOf,
  toHistoryLogs,
  type HistoryFilter,
  type MonthKey,
} from '../data/historyDisplay';
import { workoutCopy } from '../copy';

const DEFAULT_TIME_ZONE = 'Asia/Jerusalem';

function monthsBetween(from: MonthKey, to: MonthKey): number {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

async function loadHistory(coachingId?: string) {
  const [logs, plans] = await Promise.all([listWorkoutLogs(coachingId), listPlans(coachingId)]);
  return { logs, plans: plans.items, today: plans.today };
}

/**
 * Her completed workouts for the History tab. The server sends every log at once; the list is paged
 * here by month: it starts at the calendar's month and `loadMore` adds the month before it.
 * `day` (a calendar tap) narrows the list to that day.
 */
/** Coaching-aware: a coachingId narrows the history to one coach (later multi-coach UI). */
export function useWorkoutHistory(month: MonthKey | null, filter: HistoryFilter, day: string | null, enabled: boolean, coachingId?: string) {
  const copy = useCopy(workoutCopy);
  const { user } = useAuth();
  const timeZone = user?.timezone ?? DEFAULT_TIME_ZONE;
  // Not loaded until the tab is first opened.
  const load = useCallback(() => (enabled ? loadHistory(coachingId) : new Promise<never>(() => undefined)), [enabled, coachingId]);
  const { data, error, isLoading, reload } = useLoad(load, copy.list.loadError);
  const [monthsShown, setMonthsShown] = useState(1);

  const today = data?.today ?? null;
  const currentMonth = today ? monthOf(today) : null;
  const shownMonth = month ?? currentMonth;

  useEffect(() => setMonthsShown(1), [shownMonth, filter]);

  const items = useMemo(() => (data ? toHistoryLogs(data.logs, data.plans, timeZone) : []), [data, timeZone]);

  const summary = useMemo(
    () => ({
      total: items.length,
      inMonth: currentMonth ? items.filter((item) => monthOf(item.date) === currentMonth).length : 0,
      prs: items.reduce((sum, item) => sum + item.prCount, 0),
    }),
    [items, currentMonth],
  );

  const calendar = useMemo(
    () => (shownMonth && today ? buildMonthGrid(shownMonth, items, today) : []),
    [shownMonth, items, today],
  );

  const firstMonth = shownMonth ? addMonths(shownMonth, -(monthsShown - 1)) : null;
  const filtered = useMemo(() => {
    if (!shownMonth || !firstMonth) return [];
    return items.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (day) return item.date === day;
      const itemMonth = monthOf(item.date);
      return itemMonth <= shownMonth && itemMonth >= firstMonth;
    });
  }, [items, filter, day, shownMonth, firstMonth]);

  const groups = useMemo(() => groupByWeek(filtered), [filtered]);
  const monthHasLogs = filtered.some((item) => item.date.startsWith(shownMonth ?? '-'));
  // The next older month that has a matching workout: empty months are skipped, so a page always adds rows.
  const olderMonth = useMemo(() => {
    if (day || !firstMonth) return null;
    const older = items.find((item) => monthOf(item.date) < firstMonth && matchesFilter(item, filter));
    return older ? monthOf(older.date) : null;
  }, [items, filter, day, firstMonth]);
  const hasMore = olderMonth !== null;
  const loadMore = useCallback(() => {
    if (!olderMonth || !shownMonth) return;
    setMonthsShown(monthsBetween(olderMonth, shownMonth) + 1);
  }, [olderMonth, shownMonth]);

  return {
    isLoading,
    error,
    reload,
    hasLogs: items.length > 0,
    items,
    today,
    timeZone,
    currentMonth,
    shownMonth,
    summary,
    calendar,
    groups,
    monthHasLogs,
    hasMore,
    loadMore,
  };
}
