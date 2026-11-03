import type { LogPersonalRecord, WorkoutLogSet } from '@sistem/types';

// Which logged set gets the "שיא אישי" chip. The PR itself is decided ONLY on the server (one per exercise,
// personalRecordDetection.ts); this only finds the set it came from: the first completed working set with the
// record's value (weight → that weight; reps → those reps at the record's weight; duration → that hold).

function isWorking(set: WorkoutLogSet): boolean {
  return set.type === undefined || set.type === 'working';
}

function matches(set: WorkoutLogSet, record: LogPersonalRecord): boolean {
  if (record.type === 'weight') return set.weight === record.newValue;
  if (record.type === 'reps') return set.reps === record.newValue && set.weight === record.weight;
  return set.durationSec === record.newValue;
}

/** exerciseId → the setIndex that holds its PR (absent: no PR, or no set matches — the chip then sits by the name). */
export function recordSetIndexes(sets: WorkoutLogSet[], records: LogPersonalRecord[]): Map<string, number | null> {
  const result = new Map<string, number | null>();
  for (const record of records) {
    const set = sets.find((item) => item.exerciseId === record.exerciseId && item.completed && isWorking(item) && matches(item, record));
    result.set(record.exerciseId, set ? set.setIndex : null);
  }
  return result;
}
