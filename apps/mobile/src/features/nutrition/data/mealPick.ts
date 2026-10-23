import type { MealPhoto } from '@sistem/types';

// The meal photo sheet (pure): which meal to preselect, and how many photos each meal has today.

/** The meal for the time of day: the day 06:00–22:00 split evenly over the meals, in their order. */
export function mealForHour(mealIds: readonly string[], hour: number): string | null {
  if (mealIds.length === 0) return null;
  const span = 16 / mealIds.length;
  const index = Math.min(mealIds.length - 1, Math.max(0, Math.floor((hour - 6) / span)));
  return mealIds[index];
}

/** The hour now in her time zone (the server's zone for her days). */
export function hourIn(timezone: string, now: Date = new Date()): number {
  try {
    // i18n-ignore: a number read back, not text on screen (en-GB = Latin digits, 24 h)
    return Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(now));
  } catch {
    return now.getHours();
  }
}

/** "13:20" in her zone — Latin digits, shown left to right. */
export function timeIn(timezone: string, iso: string): string {
  try {
    // i18n-ignore: the design's time chip is always Latin 24 h digits (decorative, both languages)
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function photoCounts(photos: readonly MealPhoto[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const photo of photos) counts.set(photo.mealId, (counts.get(photo.mealId) ?? 0) + 1);
  return counts;
}
