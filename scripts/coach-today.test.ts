import { describe, expect, it } from 'vitest';
import type { CoachTraineeSummary } from '@sistem/types';
import { formatLateness, formatTimeLeft } from '../packages/shared/src/format';
import { buildCoachTodo, describeCoachTodoReason, describeCoachTodoSummary } from '../packages/shared/src/coachTodo';

// Coach Today (variant A, 2026-11-12): one "דורש טיפול" list; lateness in one human unit in both apps.

const HOUR = 3_600_000;
const NOW = Date.parse('2026-11-12T12:00:00Z');
const strip = (text: string) => text.replace(/[⁦-⁩]/g, '');

function trainee(id: string, fields: Partial<CoachTraineeSummary> = {}): CoachTraineeSummary {
  return { id, name: id, status: 'waiting', planDueAt: null, attention: null, ...fields } as CoachTraineeSummary;
}

describe('formatLateness', () => {
  it('uses the largest whole unit, never hours + minutes', () => {
    expect(strip(formatLateness(2 * 24 * HOUR + 5 * HOUR, 'he'))).toBe('באיחור של יומיים');
    expect(strip(formatLateness(33 * 24 * HOUR, 'he'))).toBe('באיחור של 33 ימים');
    expect(strip(formatLateness(5 * HOUR + 48 * 60_000, 'he'))).toBe('באיחור של 5 שע׳');
    expect(strip(formatLateness(HOUR, 'he'))).toBe('באיחור של שעה');
    expect(strip(formatLateness(20 * 60_000, 'en'))).toBe('Overdue by 20 minutes');
    expect(strip(formatLateness(1000, 'en'))).toBe('Overdue by 1 minute');
  });

  it('formatTimeLeft: the countdown keeps hours + minutes, lateness is human', () => {
    expect(formatTimeLeft(new Date(NOW - 796 * HOUR).toISOString(), NOW, 'he')).toEqual({ text: expect.stringContaining('33'), isOverdue: true });
    expect(strip(formatTimeLeft(new Date(NOW - 796 * HOUR).toISOString(), NOW, 'he').text)).toBe('באיחור של 33 ימים');
    expect(formatTimeLeft(new Date(NOW + 5 * HOUR).toISOString(), NOW, 'he').isOverdue).toBe(false);
  });
});

describe('buildCoachTodo', () => {
  const waiting = [
    trainee('later', { planDueAt: new Date(NOW + 30 * HOUR).toISOString() }),
    trainee('soon', { planDueAt: new Date(NOW + 6 * HOUR).toISOString() }),
    trainee('late', { planDueAt: new Date(NOW - 50 * HOUR).toISOString() }),
    trainee('notOnboarded', { status: 'new' }),
  ];
  const attention = [
    trainee('quiet', { status: 'active', attention: { reason: 'no_workout', days: 46 } }),
    trainee('late', { status: 'waiting', attention: { reason: 'missed_workouts', count: 2 } }),
  ];

  it('late windows, then closing soon, then waiting, then attention; one row per trainee; no unfinished questionnaires', () => {
    const items = buildCoachTodo({ waiting, attention }, NOW);
    expect(items.map((item) => [item.trainee.id, item.reason.kind, item.action])).toEqual([
      ['late', 'window_late', 'build_plan'],
      ['soon', 'window_soon', 'build_plan'],
      ['later', 'waiting', 'build_plan'],
      ['quiet', 'no_workout', 'message'],
    ]);
  });

  it('short reasons and the stage summary counts only the list', () => {
    const items = buildCoachTodo({ waiting, attention }, NOW);
    expect(items.map((item) => strip(describeCoachTodoReason(item.reason, 'he')))).toEqual([
      'חלון 48 השעות עבר',
      'נשארו 6 שע׳ לתוכנית',
      'מחכה לתוכנית',
      'לא התאמנה 46 ימים',
    ]);
    expect(strip(describeCoachTodoSummary(items.length, 'he'))).toBe('4 מתאמנות צריכות אותך היום');
    expect(describeCoachTodoSummary(0, 'he')).toBe('הכול בשליטה היום');
    expect(strip(describeCoachTodoSummary(1, 'en'))).toBe('1 trainee needs you today');
  });
});
