import type { Language } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill, formatPlural } from './i18n/copy';
import { isolateLtr } from './i18n/bidi';
import { dateFormat, formatNumber } from './i18n/intl';

// Display helpers, in the language on screen (Phase 15). Dates come from Intl; the
// wording around them from the shared copy (placeholders — the owner decides).

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * 'build_muscle' → 'Build muscle'. Only for values that have no translation: the imported
 * exercise facts (English, PRD §14) and unknown ids.
 */
export function humanizeId(id: string): string {
  const text = id.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function humanizeList(ids: string[] | undefined): string {
  return ids && ids.length > 0 ? ids.map(humanizeId).join(', ') : '—';
}

/** Ids → their labels ('—' for none); an id without a label is humanized. */
export function labelList(ids: string[] | undefined, labels: Readonly<Record<string, string>>, language: Language): string {
  if (!ids || ids.length === 0) return '—';
  return ids.map((id) => labels[id] ?? humanizeId(id)).join(sharedCopy[language].common.listSeparator);
}

/** Date-only strings ('YYYY-MM-DD') have no time zone: always format them in UTC. */
function parseDateOnly(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`);
}

export function addDaysToDate(dateString: string, days: number): string {
  return new Date(parseDateOnly(dateString).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** 'Sun, 4 Oct 2026' / 'יום א׳, 4 באוק׳ 2026' */
export function formatDateOnly(dateString: string, language: Language): string {
  return dateFormat(language, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(
    parseDateOnly(dateString),
  );
}

/** '8 Sept 2026' — a date without the weekday, for tight spots (date pickers). */
export function formatDateShort(dateString: string, language: Language): string {
  return dateFormat(language, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(parseDateOnly(dateString));
}

/** '4 Oct' — day and month only. */
export function formatDayMonth(dateString: string, language: Language): string {
  return dateFormat(language, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(parseDateOnly(dateString));
}

/** A plan week from its Sunday: '27 Sept – 3 Oct'. */
export function formatWeekRange(weekStartDate: string, language: Language): string {
  return fill(sharedCopy[language].time.weekRange, {
    start: formatDayMonth(weekStartDate, language),
    end: formatDayMonth(addDaysToDate(weekStartDate, 6), language),
  });
}

/** A plan week from its Sunday, short: 'Oct 4 – 10', or 'Sep 27 – Oct 3' across months (Intl ranges). */
export function formatWeekSpan(weekStartDate: string, language: Language): string {
  return dateFormat(language, { timeZone: 'UTC', month: 'short', day: 'numeric' }).formatRange(
    parseDateOnly(weekStartDate),
    parseDateOnly(addDaysToDate(weekStartDate, 6)),
  );
}

/** A plan week with its days: 'Sun, Oct 4 – Sat, Oct 10'. */
export function formatWeekSpanWithDays(weekStartDate: string, language: Language): string {
  return dateFormat(language, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).formatRange(
    parseDateOnly(weekStartDate),
    parseDateOnly(addDaysToDate(weekStartDate, 6)),
  );
}

export function formatDateTime(iso: string, language: Language): string {
  return dateFormat(language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/** '7 Oct 2026' — a moment's date in the viewer's zone. */
export function formatDate(iso: string, language: Language): string {
  return dateFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function formatHoursMinutes(ms: number, language: Language): string {
  const hours = Math.floor(ms / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  const copy = sharedCopy[language].duration;
  return hours > 0 ? fill(copy.hoursMinutes, { h: hours, m: minutes }) : fill(copy.minutes, { m: minutes });
}

/** The 48h window: how long is left, or by how much it is overdue. */
export function formatTimeLeft(dueAt: string, nowMs: number, language: Language): { text: string; isOverdue: boolean } {
  const leftMs = new Date(dueAt).getTime() - nowMs;
  const copy = sharedCopy[language].time;
  return leftMs >= 0
    ? { text: fill(copy.left, { time: formatHoursMinutes(leftMs, language) }), isOverdue: false }
    : { text: fill(copy.overdue, { time: formatHoursMinutes(-leftMs, language) }), isOverdue: true };
}

/**
 * 'לפני 5 דק׳' / '5 min ago', 'לפני שעה', 'אתמול' / 'yesterday', 'לפני 3 ימים'. The number is isolated left to right
 * (the text form of <bdi dir="ltr">: the result is also placed inside sentences, so it stays a string).
 */
export function formatTimeAgo(iso: string, nowMs: number, language: Language): string {
  const agoMs = Math.max(0, nowMs - new Date(iso).getTime());
  const copy = sharedCopy[language].timeAgo;
  const [entry, count] =
    agoMs < HOUR_MS
      ? [copy.minutes, Math.max(1, Math.floor(agoMs / MINUTE_MS))]
      : agoMs < DAY_MS
        ? [copy.hours, Math.floor(agoMs / HOUR_MS)]
        : [copy.days, Math.floor(agoMs / DAY_MS)];
  return formatPlural(language, entry, count, { count: isolateLtr(formatNumber(count, language)) });
}

/** '45s', '2 min', '1 min 30s' (Hebrew: '45 שנ׳' …). */
export function formatDuration(totalSec: number, language: Language): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const copy = sharedCopy[language].duration;
  if (minutes === 0) return fill(copy.seconds, { s: seconds });
  return seconds === 0 ? fill(copy.minutes, { m: minutes }) : fill(copy.minutesSeconds, { m: minutes, s: seconds });
}
