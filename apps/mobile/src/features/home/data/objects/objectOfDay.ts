// Which object the Home stage shows: one per day of the week (Sunday first, like her week), picked
// by the device's local day. Ids only — the builders load with three.js (dailyObjectScene.ts).

export const DAILY_OBJECT_IDS = [
  'kettlebell',
  'dumbbell',
  'weightPlate',
  'medicineBall',
  'jumpRope',
  'shakerBottle',
  'stopwatch',
] as const;

export type DailyObjectId = (typeof DAILY_OBJECT_IDS)[number];

export function objectOfDay(date: Date = new Date()): DailyObjectId {
  return DAILY_OBJECT_IDS[date.getDay()] ?? 'kettlebell';
}
