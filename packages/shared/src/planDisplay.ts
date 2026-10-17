import type { Language, PlanExercise, PlanSetTarget, ResolvedPlanSet } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill, formatPlural } from './i18n/copy';
import { isolateLtr } from './i18n/bidi';
import { weekdayName } from './i18n/intl';
import { addDaysToDate, formatDuration } from './format';

// Read-only wording for a plan, shared by the coach's and the trainee's screens. Placeholder formats — the owner decides the final ones.

/** Sunday = 0 … Saturday = 6 — the plan's day of the week, from Intl in the language on screen. */
export function dayName(dayIndex: number, language: Language): string {
  return weekdayName(dayIndex, language, 'long');
}

/** The seven day names, Sunday first (pickers). */
export function dayNames(language: Language): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => dayName(day, language));
}

/**
 * 'This week' / 'Next week' for a plan, against the trainee's current week as the server
 * sent it (CoachTraineeSummary.currentWeekStart); null for any other week.
 */
export function weekRelationLabel(weekStartDate: string, currentWeekStart: string, language: Language): string | null {
  const labels = sharedCopy[language].weekRelation;
  if (weekStartDate === currentWeekStart) return labels.this;
  if (weekStartDate === addDaysToDate(currentWeekStart, 7)) return labels.next;
  return null;
}

/** '8–10', '12' or '30s' — what one set asks for, without the unit word. */
function formatAmount(set: PlanSetTarget, language: Language): string {
  if (set.durationSec !== undefined) return formatDuration(set.durationSec, language);
  if (set.reps === undefined) return '—';
  return set.repsMax !== undefined ? isolateLtr(`${set.reps}–${set.repsMax}`) : `${set.reps}`;
}

function formatExtras(set: PlanSetTarget, language: Language): string[] {
  const copy = sharedCopy[language];
  return [
    ...(set.targetWeight !== undefined ? [`${set.targetWeight} ${copy.units.kg}`] : []),
    ...(set.restSec ? [fill(copy.plan.rest, { time: formatDuration(set.restSec, language) })] : []),
  ];
}

/**
 * '3 × 8–10', '3 × 45 שנ׳': only the arithmetic is kept left to right; a unit word after the
 * number stays outside it, so Hebrew reads "3 × 45" and then "שנ׳".
 */
function timesAmount(count: number, amount: string): string {
  const [head, ...rest] = amount.split(' ');
  return isolateLtr(`${count} × ${head}`) + (rest.length > 0 ? ` ${rest.join(' ')}` : '');
}

function isSameTarget(a: ResolvedPlanSet, b: ResolvedPlanSet): boolean {
  return (
    a.type === b.type &&
    a.reps === b.reps &&
    a.repsMax === b.repsMax &&
    a.durationSec === b.durationSec &&
    a.targetWeight === b.targetWeight &&
    a.restSec === b.restSec
  );
}

/**
 * The targets of one exercise, from the server's resolvedSets (sets are never derived
 * here): one line when every set is the same ('3 × 8–10 · 40 kg · rest 1 min 30s'),
 * otherwise one line per set ('1 · Warm-up · 10 · 20 kg'). 'sets × amount' is kept
 * left to right inside Hebrew text.
 */
export function describeTargets(sets: ResolvedPlanSet[], language: Language): string[] {
  if (sets.length === 0) return [];

  const first = sets[0];
  if (first.type === 'working' && sets.every((set) => isSameTarget(set, first))) {
    return [[timesAmount(sets.length, formatAmount(first, language)), ...formatExtras(first, language)].join(' · ')];
  }

  const setTypes = sharedCopy[language].plan.setTypes;
  return sets.map((set) =>
    [`${set.setIndex + 1}`, setTypes[set.type], formatAmount(set, language), ...formatExtras(set, language)].join(' · '),
  );
}

/**
 * 'Interval · 8 rounds · 20s work / 10s rest' for an interval exercise (from its first
 * set — the usual case is the same work and rest every round); null otherwise.
 */
export function describeInterval(exercise: Pick<PlanExercise, 'interval' | 'resolvedSets'>, language: Language): string | null {
  const first = exercise.resolvedSets[0];
  if (!exercise.interval || !first) return null;
  const copy = sharedCopy[language].plan;
  const rounds = exercise.resolvedSets.length;
  return [
    copy.interval,
    formatPlural(language, copy.rounds, rounds),
    fill(copy.workRest, { work: formatDuration(first.durationSec ?? 0, language), rest: formatDuration(first.restSec ?? 0, language) }),
  ].join(' · ');
}

/**
 * The short target of one exercise for a list ('3 × 10', '3 × 45 שנ׳'): its working sets when they
 * all ask for the same thing (warm-ups / drops left out), otherwise just the set count ('5 sets').
 */
export function describeSetsShort(sets: ResolvedPlanSet[], language: Language): string {
  const working = sets.filter((set) => set.type === 'working');
  const base = working.length > 0 ? working : sets;
  const first = base[0];
  if (first && base.every((set) => isSameAmount(set, first))) return timesAmount(base.length, formatAmount(first, language));
  return formatPlural(language, sharedCopy[language].plan.setCount, sets.length);
}

function isSameAmount(a: PlanSetTarget, b: PlanSetTarget): boolean {
  return a.reps === b.reps && a.repsMax === b.repsMax && a.durationSec === b.durationSec;
}
