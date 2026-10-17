import type { Language, TraineePlan, WorkoutLog } from '@sistem/types';
import { addDaysToDate, dateFormat, fill, sharedCopy, todayInTimezone } from '@sistem/shared';
import { workoutColorClass } from '../../home/data/homeDisplay';
import { isFreeLog } from './freeWorkout';
import { letterOf } from './weekPlanDisplay';

// The Workouts screen's "History" tab as plain functions: her completed logs placed on her calendar
// (dates in her stored time zone), filtered and grouped by plan week (Sunday weeks).

export type HistoryFilter = 'all' | 'plan' | 'free' | 'pr';
export const HISTORY_FILTERS: HistoryFilter[] = ['all', 'plan', 'free', 'pr'];

const DAYS_IN_WEEK = 7;
const SECONDS_PER_MINUTE = 60;

export interface HistoryLog {
  log: WorkoutLog;
  /** 'YYYY-MM-DD' of the finish, in her zone. */
  date: string;
  /** The identity color of the planned workout (its place in its plan); null for a free workout or a workout gone from the plan. */
  colorClass: string | null;
  letter: string | null;
  isFree: boolean;
  /** Finished with sets left not done. */
  isPartial: boolean;
  prCount: number;
  durationSec: number;
}

/** 'YYYY-MM' */
export type MonthKey = string;

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function weekStartOf(date: string): string {
  return addDaysToDate(date, -dayOfWeek(date));
}

export function monthOf(date: string): MonthKey {
  return date.slice(0, 7);
}

export function addMonths(month: MonthKey, count: number): MonthKey {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + count, 1));
  return date.toISOString().slice(0, 7);
}

/** Her completed logs, newest first, each with its day, color and tags. */
export function toHistoryLogs(logs: WorkoutLog[], plans: TraineePlan[], timeZone: string): HistoryLog[] {
  const places = new Map<string, number>();
  for (const plan of plans) plan.workouts.forEach((workout, index) => places.set(`${plan.id}:${workout.id}`, index));

  return logs
    .filter((log) => log.status === 'completed')
    .map((log) => {
      const isFree = isFreeLog(log);
      const place = isFree ? undefined : places.get(`${log.planId}:${log.workoutId}`);
      const finishedAt = log.finishedAt ?? log.startedAt;
      return {
        log,
        date: todayInTimezone(timeZone, new Date(finishedAt)),
        colorClass: place === undefined ? null : workoutColorClass(place),
        letter: place === undefined ? null : letterOf(place),
        isFree,
        isPartial: log.sets.some((set) => !set.completed),
        prCount: log.stats?.prCount ?? log.personalRecords?.length ?? 0,
        durationSec: log.stats?.durationSec ?? 0,
      };
    })
    .sort((a, b) => (b.log.finishedAt ?? b.log.startedAt).localeCompare(a.log.finishedAt ?? a.log.startedAt));
}

export function matchesFilter(item: HistoryLog, filter: HistoryFilter): boolean {
  if (filter === 'plan') return !item.isFree;
  if (filter === 'free') return item.isFree;
  if (filter === 'pr') return item.prCount > 0;
  return true;
}

export interface CalendarDay {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** Her workouts that day, newest first (unfiltered: the calendar always shows every workout). */
  logs: HistoryLog[];
}

/** Whole weeks, Sunday first, covering the month (leading / trailing days of the next and previous months). */
export function buildMonthGrid(month: MonthKey, items: HistoryLog[], today: string): CalendarDay[] {
  const first = `${month}-01`;
  const last = addDaysToDate(`${addMonths(month, 1)}-01`, -1);
  const start = weekStartOf(first);
  const end = addDaysToDate(weekStartOf(last), DAYS_IN_WEEK - 1);
  const byDate = new Map<string, HistoryLog[]>();
  for (const item of items) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);

  const days: CalendarDay[] = [];
  for (let date = start; date <= end; date = addDaysToDate(date, 1)) {
    days.push({
      date,
      inMonth: monthOf(date) === month,
      isToday: date === today,
      isFuture: date > today,
      logs: byDate.get(date) ?? [],
    });
  }
  return days;
}

export interface LogWeekGroup {
  weekStartDate: string;
  items: HistoryLog[];
  totalSec: number;
}

/** Newest week first; items keep their order (newest first). */
export function groupByWeek(items: HistoryLog[]): LogWeekGroup[] {
  const groups: LogWeekGroup[] = [];
  for (const item of items) {
    const weekStartDate = weekStartOf(item.date);
    let group = groups.find((entry) => entry.weekStartDate === weekStartDate);
    if (!group) {
      group = { weekStartDate, items: [], totalSec: 0 };
      groups.push(group);
    }
    group.items.push(item);
    group.totalSec += item.durationSec;
  }
  return groups;
}

/** '2 h 14 min' / '45 min' — a week's total time (shared duration words). */
export function formatTotalTime(totalSec: number, language: Language): string {
  const minutes = Math.round(totalSec / SECONDS_PER_MINUTE);
  const copy = sharedCopy[language].duration;
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? fill(copy.hoursMinutes, { h: hours, m: minutes % 60 }) : fill(copy.minutes, { m: minutes });
}

export function minutesOf(durationSec: number): number {
  return Math.round(durationSec / SECONDS_PER_MINUTE);
}

/** 'October 2026' */
export function formatMonthTitle(month: MonthKey, language: Language): string {
  return dateFormat(language, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00Z`));
}

/** 'October' */
export function formatMonthName(month: MonthKey, language: Language): string {
  return dateFormat(language, { timeZone: 'UTC', month: 'long' }).format(new Date(`${month}-01T00:00:00Z`));
}

/** 'Tue, 13 Oct' — a log's day in her zone. */
export function formatLogDay(iso: string, timeZone: string, language: Language): string {
  return dateFormat(language, { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** '18:40' in her zone. */
export function formatLogTime(iso: string, timeZone: string, language: Language): string {
  return dateFormat(language, { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** The day of the month, for a calendar cell. */
export function dayNumber(date: string): number {
  return Number(date.slice(8, 10));
}
