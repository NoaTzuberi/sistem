import type { CardioSport, Language } from '@sistem/types';
import { dateFormat } from '@sistem/shared';

// Small display bits of the builder.

/** "א׳" in Hebrew, "Sun" in English (a narrow English letter would repeat: S, T). */
export function shortDayName(day: number, language: Language): string {
  return dateFormat(language, { weekday: language === 'he' ? 'narrow' : 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 18 + day)));
}

// The preview's mono eyebrow (Latin in both languages, hidden from screen readers — like the app's eyebrows).
const SPORT_EYEBROW: Record<CardioSport, string> = { run: 'RUN', intervals: 'RUN', walk: 'WALK', bike: 'RIDE' };

export function previewEyebrow(sport: CardioSport, minutes: number): string {
  return `${SPORT_EYEBROW[sport]} · ${minutes} MIN`; // i18n-ignore: decorative mono eyebrow, aria-hidden
}

export function stepsEyebrow(count: number): string {
  return `INTENSITY · ${count} STEPS`; // i18n-ignore: decorative mono eyebrow, aria-hidden
}

/** A bar's height: 18% + 8% per intensity point (the design's graph). */
export function barHeight(intensity: number): string {
  return `${18 + intensity * 8}%`;
}
