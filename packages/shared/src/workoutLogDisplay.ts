import type { Language, LogPersonalRecord, WorkoutLog, WorkoutLogSet } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill, formatPlural } from './i18n/copy';
import { isolateAuto } from './i18n/bidi';
import { formatDuration } from './format';

// Read-only wording for a workout log, shared by the coach's and the trainee's screens.
// Placeholder formats — the owner decides the final ones.

/** '1 · 10 reps × 40 kg' — one performed set. */
/** What one logged set was: '12 חזרות', '45 שנ׳', '10 חזרות × 20 ק״ג' (no number, no "not done"). */
export function describeLogSetAmount(set: WorkoutLogSet, language: Language): string {
  const copy = sharedCopy[language];
  const amount =
    set.durationSec !== undefined ? formatDuration(set.durationSec, language) : fill(copy.log.reps, { reps: set.reps ?? '—' });
  return set.weight !== undefined ? `${amount} × ${set.weight} ${copy.units.kg}` : amount;
}

export function describeLogSet(set: WorkoutLogSet, language: Language): string {
  const copy = sharedCopy[language];
  return `${set.setIndex + 1} · ${describeLogSetAmount(set, language)}${set.completed ? '' : ` · ${copy.log.notDone}`}`;
}

export interface LogExerciseGroup {
  exerciseId: string;
  sets: WorkoutLogSet[];
}

/** The sets of a log, kept in order, one group per run of the same exercise. */
export function groupLogSetsByExercise(sets: WorkoutLogSet[]): LogExerciseGroup[] {
  const groups: LogExerciseGroup[] = [];
  for (const set of sets) {
    const last = groups[groups.length - 1];
    if (last && last.exerciseId === set.exerciseId) last.sets.push(set);
    else groups.push({ exerciseId: set.exerciseId, sets: [set] });
  }
  return groups;
}

/** Exercise id → name, from the facts the read endpoints attach to a log. */
export function logExerciseNames(log: WorkoutLog): Map<string, string> {
  return new Map(log.exercises?.map((exercise) => [exercise.id, exercise.name]));
}

/**
 * 'Hip thrust — 62.5 kg (was 60 kg)' · 'Push-up — 20 reps (was 15)' ·
 * 'Plank — 1 min 15s hold (was 1 min)'. Placeholder wording.
 */
export function describePersonalRecord(record: LogPersonalRecord, exerciseName: string | undefined, language: Language): string {
  const copy = sharedCopy[language];
  // Number then unit reads right in both directions; only arithmetic needs an isolate.
  const kg = (value: number) => `${value} ${copy.units.kg}`;
  const name = exerciseName ? isolateAuto(exerciseName) : copy.log.exercise;
  const at = record.weight !== undefined ? fill(copy.log.prAt, { weight: kg(record.weight) }) : '';
  switch (record.type) {
    case 'weight':
      return fill(copy.log.prWeight, { name, value: kg(record.newValue), previous: kg(record.previousValue) });
    case 'reps':
      return fill(copy.log.prReps, { name, value: record.newValue, previous: record.previousValue, at });
    case 'duration':
      return fill(copy.log.prDuration, {
        name,
        value: formatDuration(record.newValue, language),
        previous: formatDuration(record.previousValue, language),
        at,
      });
  }
}

export function prCountLabel(count: number, language: Language): string {
  return formatPlural(language, sharedCopy[language].log.prCount, count);
}
