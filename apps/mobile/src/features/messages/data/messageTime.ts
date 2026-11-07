import type { Language } from '@sistem/types';
import { dateFormat } from '@sistem/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar day of a moment in the viewer's zone, as a comparable key. */
export function messageDayKey(ms: number, timezone: string, language: Language): string {
  return dateFormat(language, { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
}

/** "14:05" — the bubble's time (the day separator above it says which day). */
export function messageClock(iso: string, timezone: string, language: Language): string {
  return dateFormat(language, { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(Date.parse(iso));
}

/** The day separator: "היום", "אתמול", else "יום ב׳, 3 בנוב׳" (with the year when it isn't this year). */
export function messageDayLabel(
  iso: string,
  timezone: string,
  language: Language,
  words: { today: string; yesterday: string },
  nowMs: number = Date.now(),
): string {
  const ms = Date.parse(iso);
  const day = messageDayKey(ms, timezone, language);
  if (day === messageDayKey(nowMs, timezone, language)) return words.today;
  if (day === messageDayKey(nowMs - DAY_MS, timezone, language)) return words.yesterday;
  const sameYear = dateFormat(language, { timeZone: timezone, year: 'numeric' });
  return dateFormat(language, {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear.format(ms) === sameYear.format(nowMs) ? {} : { year: 'numeric' }),
  }).format(ms);
}
