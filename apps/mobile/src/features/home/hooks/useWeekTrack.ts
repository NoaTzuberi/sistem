import { useMemo, useState } from 'react';
import type { TraineeWeek } from '@sistem/types';
import { type WeekDay, buildWeekDays } from '../data/homeDisplay';

/**
 * Home's week track: the seven lanes (each drawn from the server's statuses — done / missed /
 * today) and which one is selected. Today is selected until she taps another day; a week
 * without today in it (never on Home) falls back to Sunday.
 */
export function useWeekTrack(week: TraineeWeek | null | undefined) {
  const days = useMemo(() => (week ? buildWeekDays(week) : []), [week]);
  const [tapped, setTapped] = useState<number | null>(null);

  const todayIndex = days.findIndex((day) => day.isToday);
  const selected = tapped ?? (todayIndex === -1 ? 0 : todayIndex);
  const selectedDay: WeekDay | null = days[selected] ?? null;

  return { days, selected, selectedDay, select: setTapped };
}
