import type { CardioSport } from '@sistem/types';

// Mono eyebrows (Latin in both languages, hidden from screen readers) and the title's number runs.

const SPORT_EYEBROW: Record<CardioSport, string[]> = { run: ['RUN'], intervals: ['RUN', 'INTERVALS'], walk: ['WALK'], bike: ['RIDE'] };

/** "RUN · INTERVALS · TUE 20.10" — read off the 'YYYY-MM-DD' string, no locale involved (no date: no day part). */
export function detailEyebrow(sport: CardioSport, date: string | null, weekdays: readonly string[]): string {
  if (!date) return SPORT_EYEBROW[sport].join(' · ');
  const [, month, day] = date.split('-');
  const weekday = weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? '';
  return [...SPORT_EYEBROW[sport], `${weekday} ${day}.${month}`].join(' · ');
}

/** The live eyebrow: "ROUND 3/8", "WARM UP", "COOL DOWN" (nothing for a lone middle block). */
export function liveEyebrow(kind: string, round: number | null, rounds: number | null): string {
  if (round !== null && rounds !== null) return `ROUND ${round}/${rounds}`; // i18n-ignore: decorative mono eyebrow
  if (kind === 'warmup') return 'WARM UP'; // i18n-ignore: decorative mono eyebrow
  if (kind === 'cooldown') return 'COOL DOWN'; // i18n-ignore: decorative mono eyebrow
  return '';
}

export function doneEyebrow(clock: string): string {
  return `DONE · ${clock}`;
}

/** Splits a title into Hebrew and Latin / number runs ("אינטרוולים 1:1" → the "1:1" gets Barlow italic). */
export function titleRuns(title: string): { text: string; latin: boolean }[] {
  return title.split(/([A-Za-z0-9][A-Za-z0-9:.'’/-]*)/).filter(Boolean).map((text) => ({ text, latin: /^[A-Za-z0-9]/.test(text) }));
}

/** Long Hebrew block names ("התאוששות") take the smaller live size so they never wrap. */
export const LONG_BLOCK_NAME = 5;
