import type { Language, LastPerformance, SetType, TraineePlanWorkout } from '@sistem/types';
import { fill, formatDuration, formatPlural, sharedCopy } from '@sistem/shared';
import type { BadgeVariant } from '../../../components/common/Badge/Badge';
import type { workoutCopy } from '../copy';

// Display helpers of the Workouts screens, in the language on screen (Phase 15). The words are in
// copy/; the statuses themselves always come from the server.

type WorkoutCopy = (typeof workoutCopy)['he'];

export function exerciseCountLabel(count: number, copy: WorkoutCopy, language: Language): string {
  return formatPlural(language, copy.list.exerciseCount, count);
}

/** The badge of a workout row. The status itself always comes from the server. */
export function workoutStatusBadge(workout: TraineePlanWorkout, copy: WorkoutCopy): { label: string; variant: BadgeVariant } {
  if (workout.status === 'done') return { label: copy.status.done, variant: 'accent' };
  if (workout.inProgress) return { label: copy.status.inProgress, variant: 'solid' };
  if (workout.status === 'missed') return { label: copy.status.missed, variant: 'neutral' };
  if (workout.isToday) return { label: copy.status.today, variant: 'solid' };
  return { label: copy.status.upcoming, variant: 'neutral' };
}

/** A warm-up / drop letter, or the working set's number (counted among working sets only). */
export function setTag(type: SetType, workingNumber: number, copy: WorkoutCopy): string {
  if (type === 'warmup') return copy.session.tagWarmup;
  if (type === 'drop') return copy.session.tagDrop;
  return String(workingNumber);
}

/** "40 kg × 10", "45s · 5 kg", "12 reps" — kept left to right inside Hebrew text. */
export function lastTimeLabel(last: LastPerformance, language: Language): string {
  const { units, log } = sharedCopy[language];
  const parts: string[] = [];
  if (last.durationSec !== undefined) parts.push(formatDuration(last.durationSec, language));
  if (last.weight !== undefined && last.reps !== undefined) parts.push(`${last.weight} ${units.kg} × ${last.reps}`);
  else if (last.reps !== undefined) parts.push(fill(log.reps, { reps: last.reps }));
  else if (last.weight !== undefined) parts.push(`${last.weight} ${units.kg}`);
  return parts.join(' · ');
}

/** 1:05 — a running clock (rest, a hold, time since start). Digits and colons read the same in both languages. */
export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** A rest on the player's scoreboard: 45″, 2′, 1:30 (minutes ′ and seconds ″ read the same in both languages). */
export function formatRest(sec: number): string {
  if (sec < 60) return `${sec}″`;
  if (sec % 60 === 0) return `${sec / 60}′`;
  return formatClock(sec);
}

/** "8–12", or one number when the range is a single value. */
export function formatRange(range: { min: number; max: number }, format: (value: number) => string = String): string {
  return range.min === range.max ? format(range.min) : `${format(range.min)}–${format(range.max)}`;
}
