import type { CoachTodayResponse, CoachTraineeSummary, Language } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill, formatPlural } from './i18n/copy';
import { isolateLtr } from './i18n/bidi';
import { formatNumber } from './i18n/intl';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** A 48h window closing within this many hours (or already passed) is an alert — dashboard bell and coach Today. */
export const URGENT_WINDOW_HOURS = 12;

export function isPlanWindowUrgent(planDueAt: string, nowMs: number): boolean {
  return new Date(planDueAt).getTime() - nowMs < URGENT_WINDOW_HOURS * HOUR_MS;
}

export type CoachTodoReason =
  | { kind: 'window_late' }
  | { kind: 'window_soon'; leftMs: number }
  | { kind: 'waiting' }
  | { kind: 'no_workout'; days: number }
  | { kind: 'missed'; count: number };

export interface CoachTodoItem {
  trainee: CoachTraineeSummary;
  reason: CoachTodoReason;
  /** The one button: build her first plan, or a message. */
  action: 'build_plan' | 'message';
}

/**
 * "דורש טיפול" on coach Today — one action list, most urgent first: passed 48h windows (latest first), windows
 * closing within 12 hours, the other trainees waiting for a plan, then the server's attention rule. One row per
 * trainee. Its length is the stage's summary count.
 */
export function buildCoachTodo(today: Pick<CoachTodayResponse, 'waiting' | 'attention'>, nowMs: number): CoachTodoItem[] {
  const waiting = today.waiting
    .filter((trainee): trainee is CoachTraineeSummary & { planDueAt: string } => trainee.status === 'waiting' && trainee.planDueAt !== null)
    .sort((a, b) => a.planDueAt.localeCompare(b.planDueAt));
  const items: CoachTodoItem[] = waiting.map((trainee) => {
    const leftMs = new Date(trainee.planDueAt).getTime() - nowMs;
    const reason: CoachTodoReason =
      leftMs < 0 ? { kind: 'window_late' } : isPlanWindowUrgent(trainee.planDueAt, nowMs) ? { kind: 'window_soon', leftMs } : { kind: 'waiting' };
    return { trainee, reason, action: 'build_plan' };
  });
  const rank = (item: CoachTodoItem) => ({ window_late: 0, window_soon: 1, waiting: 2, no_workout: 3, missed: 3 })[item.reason.kind];
  items.sort((a, b) => rank(a) - rank(b));
  const seen = new Set(items.map((item) => item.trainee.id));
  for (const trainee of today.attention) {
    if (seen.has(trainee.id) || !trainee.attention) continue;
    seen.add(trainee.id);
    const reason: CoachTodoReason =
      trainee.attention.reason === 'no_workout' ? { kind: 'no_workout', days: trainee.attention.days } : { kind: 'missed', count: trainee.attention.count };
    items.push({ trainee, reason, action: 'message' });
  }
  return items;
}

/** The reason in a few words ("חלון 48 השעות עבר", "נשארו 6 שע׳ לתוכנית", "לא התאמנה 46 ימים"). */
export function describeCoachTodoReason(reason: CoachTodoReason, language: Language): string {
  const copy = sharedCopy[language].coachTodo;
  const count = (value: number) => ({ count: isolateLtr(formatNumber(value, language)) });
  switch (reason.kind) {
    case 'window_late':
      return copy.windowLate;
    case 'window_soon': {
      const hours = Math.floor(reason.leftMs / HOUR_MS);
      const time =
        hours >= 1
          ? formatPlural(language, copy.hoursLeft, hours, count(hours))
          : formatPlural(language, copy.minutesLeft, Math.max(1, Math.floor(reason.leftMs / MINUTE_MS)), count(Math.max(1, Math.floor(reason.leftMs / MINUTE_MS))));
      return fill(copy.windowSoon, { time });
    }
    case 'waiting':
      return copy.waiting;
    case 'no_workout':
      return formatPlural(language, copy.noWorkout, reason.days, count(reason.days));
    case 'missed':
      return formatPlural(language, copy.missed, reason.count, count(reason.count));
  }
}

/** The stage's one line: "{n} מתאמנות צריכות אותך היום", or "הכול בשליטה היום" at 0. */
export function describeCoachTodoSummary(count: number, language: Language): string {
  const copy = sharedCopy[language].coachTodo;
  return count === 0 ? copy.summaryNone : formatPlural(language, copy.summary, count, { count: isolateLtr(formatNumber(count, language)) });
}
