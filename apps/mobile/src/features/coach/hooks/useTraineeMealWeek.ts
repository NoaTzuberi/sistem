import { useCallback, useState } from 'react';
import { addDaysToDate, useLoad } from '@sistem/shared';
import { getTraineeMealLogs } from '../../../services/coach/coachService';

/**
 * Her portion tracking for one Sunday week (coach mode, read-only): the days, the picked day (today in the
 * current week, else the week's last day), and the week arrows. The server knows her zone and "today".
 */
export function useTraineeMealWeek(traineeId: string, errorMessage: string) {
  // null = her current week.
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const load = useCallback(() => getTraineeMealLogs(traineeId, weekStart ?? undefined), [traineeId, weekStart]);
  const { data, error, isLoading, reload } = useLoad(load, errorMessage);

  const isCurrentWeek = data ? data.today >= data.weekStart && data.today <= addDaysToDate(data.weekStart, 6) : true;
  const date = data
    ? picked && data.days.some((day) => day.date === picked)
      ? picked
      : isCurrentWeek
        ? data.today
        : data.days[data.days.length - 1]?.date
    : undefined;

  function moveWeek(days: number) {
    if (!data) return;
    setPicked(null);
    setWeekStart(addDaysToDate(data.weekStart, days));
  }

  return {
    data,
    error,
    isLoading,
    reload,
    isCurrentWeek,
    date,
    day: data?.days.find((entry) => entry.date === date),
    /** The week's days up to today, newest first (the day cards). */
    pastDays: data ? data.days.filter((entry) => entry.date <= data.today).reverse() : [],
    pick: setPicked,
    previousWeek: () => moveWeek(-7),
    nextWeek: () => moveWeek(7),
  };
}
