import type { CoachTraineeSummary, Language } from '@sistem/types';
import { dateFormat, fill, formatPlural, formatTimeAgo } from '@sistem/shared';
import type { coachCopy } from '../copy';

// Coach mode helpers (mobile only): the list's filters and tags, a row's sub line, a trainee's color, the
// greeting. Statuses, the attention rule and the weeks are the server's — nothing is derived here.

type CoachCopy = (typeof coachCopy)['he'];

/** The server's default zone, for an account read before its zone arrived. */
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

/** archive = ended coachings: a separate read-only list (/coach/archive), never part of the live counts. */
export const COACH_LIST_FILTERS = ['all', 'waiting', 'active', 'attention', 'archive'] as const;
export type CoachListFilter = (typeof COACH_LIST_FILTERS)[number];

export const COACH_LIST_FILTER_PARAM = 'filter';

export function coachListFilterOf(value: string | null): CoachListFilter {
  return (COACH_LIST_FILTERS as readonly string[]).includes(value ?? '') ? (value as CoachListFilter) : 'all';
}

/** "מחכות" = her coaching is waiting for its first plan; "פעילות" = an active coaching; "תשומת לב" = the rule. */
export function matchesCoachFilter(trainee: CoachTraineeSummary, filter: CoachListFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'waiting') return trainee.coachingStatus === 'waiting';
  if (filter === 'active') return trainee.coachingStatus === 'active';
  if (filter === 'archive') return false;
  return trainee.attention !== null;
}

export type CoachTag = 'active' | 'waiting' | 'attention';

/** The row's status tag: attention wins over active. */
export function coachTagOf(trainee: CoachTraineeSummary): CoachTag {
  if (trainee.attention) return 'attention';
  return trainee.coachingStatus === 'waiting' ? 'waiting' : 'active';
}

/** Attention first, then waiting (longest wait first), then the rest as the server sent them. */
export function sortForCoach(trainees: CoachTraineeSummary[]): CoachTraineeSummary[] {
  const rank = (trainee: CoachTraineeSummary) => ({ attention: 0, waiting: 1, active: 2 })[coachTagOf(trainee)];
  return [...trainees].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return coachTagOf(a) === 'waiting' ? a.coachingStartedAt.localeCompare(b.coachingStartedAt) : 0;
  });
}

/** "הצטרפה לפני יומיים · שאלון מולא" — a waiting trainee's line. */
export function waitingLine(trainee: CoachTraineeSummary, nowMs: number, copy: CoachCopy, language: Language): string {
  const joined = fill(copy.today.joined, { time: formatTimeAgo(trainee.coachingStartedAt, nowMs, language) });
  const questionnaire = trainee.onboardingStatus === 'completed' ? copy.today.questionnaireDone : copy.today.questionnaireNotDone;
  return `${joined} · ${questionnaire}`;
}

/** The attention reason as a short line ("לא התאמנה 6 ימים" / "דילגה על 2 אימונים"). */
export function attentionLine(trainee: CoachTraineeSummary, copy: CoachCopy, language: Language): string | null {
  const attention = trainee.attention;
  if (!attention) return null;
  return attention.reason === 'no_workout'
    ? formatPlural(language, copy.list.noWorkoutDays, attention.days)
    : formatPlural(language, copy.list.missedWorkouts, attention.count);
}

/** A list row's sub line: the attention reason, the waiting line, or "שבוע N · x/y אימונים". */
export function traineeSubLine(trainee: CoachTraineeSummary, nowMs: number, copy: CoachCopy, language: Language): string {
  const attention = attentionLine(trainee, copy, language);
  if (attention) return attention;
  if (trainee.coachingStatus === 'waiting') return waitingLine(trainee, nowMs, copy, language);
  const week = trainee.thisWeek;
  if (!week) return copy.list.noPlanThisWeek;
  const counts = { done: week.completed, planned: week.planned };
  return trainee.coachingWeek ? fill(copy.list.weekLine, { week: trainee.coachingWeek, ...counts }) : fill(copy.list.planLine, counts);
}

const TRAINEE_COLOR_COUNT = 4;

/** A stable color from a seed (her id; a workout's name): one of four, the same on every screen. */
function colorIndex(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % TRAINEE_COLOR_COUNT) + 1;
}

/** A trainee's own color (avatar, pips) — CoachAvatar.css: --trainee-color. */
export function traineeColorClass(seed: string): string {
  return `trainee-color-${colorIndex(seed)}`;
}

/** A logged workout's color bar when its place in a plan is unknown — --workout-color (one of the four). */
export function workoutColorOf(title: string): string {
  return `workout-color-${colorIndex(title)}`;
}

export type DayPart = keyof CoachCopy['today']['greeting'];

/** Morning 5–11, noon 12–16, evening 17–21, night 22–4 — in her zone, on the server's clock. */
export function dayPartAt(nowMs: number, timezone: string): DayPart {
  // i18n-ignore: only reads the hour as a number (never shown), so a fixed Latin-digit locale.
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone }).format(nowMs));
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'noon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/** "26.10" from a 'YYYY-MM-DD' (the mono eyebrows — no locale). */
export function dayMonthOf(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}.${month}`;
}

/** "WK07": the week number in the mono eyebrows. */
export function weekEyebrow(prefix: string, week: number): string {
  return `${prefix}${String(week).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' of an instant in a zone. */
export function localDateOf(iso: string | number, timezone: string): string {
  // i18n-ignore: en-CA formats as 'YYYY-MM-DD' — a key, never shown.
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

/** "19:40" in her zone. */
export function timeOf(iso: string, timezone: string, language: Language): string {
  return dateFormat(language, { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(iso));
}

/** "09.2026" — "בליווי מאז". */
export function monthYearOf(iso: string, timezone: string): string {
  const [year, month] = localDateOf(iso, timezone).split('-');
  return `${month}.${year}`;
}
