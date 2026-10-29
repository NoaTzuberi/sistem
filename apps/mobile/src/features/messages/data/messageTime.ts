import type { Language } from '@sistem/types';
import { dateFormat } from '@sistem/shared';

/** "14:05" today, else "26.10 14:05" — in the viewer's zone. */
export function messageTimeOf(iso: string, timezone: string, language: Language, nowMs: number = Date.now()): string {
  const day = (ms: number) => dateFormat(language, { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  const time = dateFormat(language, { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(Date.parse(iso));
  if (day(Date.parse(iso)) === day(nowMs)) return time;
  const date = dateFormat(language, { timeZone: timezone, day: 'numeric', month: 'numeric' }).format(Date.parse(iso));
  return `${date} ${time}`;
}
