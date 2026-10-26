import type { CoachActivityItem, CoachActivityRecord, CoachTraineeSummary, Language } from '@sistem/types';
import { fill, formatDuration, formatNumber, formatPlural, isolateLtr, measurementLabel, prCountLabel } from '@sistem/shared';
import type { coachCopy } from '../copy';
import type { TraineeTab } from './traineeTabs';
import { localDateOf } from './coachMode';

// What a Today feed item says (coach mode). Every text comes from the copy; "{name}" stays in the
// sentence so the screen can set her name in bold.

type CoachCopy = (typeof coachCopy)['he'];

export type ActivityKind = 'workout' | 'cardio' | 'photo' | 'measurements' | 'joined';

export interface ActivityChip {
  id: string;
  text: string;
  /** The PR chip (blush). */
  record?: boolean;
}

export interface ActivityView {
  kind: ActivityKind;
  /** The sentence, with "{name}" where her name goes. */
  sentence: string;
  chips: ActivityChip[];
  /** Where a tap opens her screen. */
  tab: TraineeTab;
  /** Photos to show blurred (meal / progress / Daily Pump). */
  photos: string[];
  /** "צפייה בשאלון" under a join. */
  questionnaireCta: boolean;
}

function minutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function signed(delta: number, language: Language): string {
  const value = formatNumber(Math.abs(delta), language, { maximumFractionDigits: 1 });
  return isolateLtr(`${delta < 0 ? '−' : '+'}${value}`);
}

function recordValue(record: CoachActivityRecord, copy: CoachCopy, language: Language): string {
  if (record.type === 'weight') return fill(copy.feed.kg, { value: formatNumber(record.value, language, { maximumFractionDigits: 1 }) });
  if (record.type === 'reps') return formatPlural(language, copy.feed.reps, record.value);
  return formatDuration(record.value, language);
}

export function describeActivity(item: CoachActivityItem, copy: CoachCopy, language: Language): ActivityView {
  const base = { chips: [] as ActivityChip[], photos: [] as string[], questionnaireCta: false };
  switch (item.type) {
    case 'workout_completed': {
      const chips: ActivityChip[] = [];
      if (item.free) chips.push({ id: 'free', text: copy.feed.freeWorkout });
      if (item.setsCompleted > 0) chips.push({ id: 'sets', text: formatPlural(language, copy.feed.sets, item.setsCompleted) });
      if (item.durationSec > 0) chips.push({ id: 'minutes', text: fill(copy.feed.minutes, { count: minutes(item.durationSec) }) });
      if (item.rating !== null) chips.push({ id: 'rating', text: fill(copy.feed.rating, { rating: item.rating }) });
      if (item.record) {
        chips.push({ id: 'pr', record: true, text: fill(copy.feed.record, { name: item.record.exerciseName, value: recordValue(item.record, copy, language) }) });
      } else if (item.prCount > 0) {
        chips.push({ id: 'pr', record: true, text: prCountLabel(item.prCount, language) });
      }
      return { ...base, kind: 'workout', sentence: fill(copy.feed.workout, { title: item.workoutTitle }), chips, tab: 'workouts' };
    }
    case 'cardio_completed': {
      const chips: ActivityChip[] = [{ id: 'minutes', text: fill(copy.feed.minutes, { count: minutes(item.completedSec) }) }];
      if (item.roundsTotal > 0) chips.push({ id: 'rounds', text: fill(copy.feed.rounds, { done: item.roundsDone, total: item.roundsTotal }) });
      if (item.distanceKm !== null) {
        chips.push({ id: 'distance', text: fill(copy.feed.distance, { km: formatNumber(item.distanceKm, language, { maximumFractionDigits: 1 }) }) });
      }
      return { ...base, kind: 'cardio', sentence: fill(copy.feed.cardio, { title: item.workoutTitle }), chips, tab: 'workouts' };
    }
    case 'photos_uploaded': {
      const photos = item.photos.map((photo) => photo.url);
      if (item.source === 'pump') return { ...base, kind: 'photo', sentence: copy.feed.pumpPhoto, photos, tab: 'workouts' };
      const entry = item.source === 'meal' ? copy.feed.mealPhotos : copy.feed.progressPhotos;
      return { ...base, kind: 'photo', sentence: formatPlural(language, entry, item.count), photos, tab: item.source === 'meal' ? 'nutrition' : 'body' };
    }
    case 'measurements_updated': {
      const chips: ActivityChip[] = [];
      if (item.weightKg !== null) {
        chips.push({ id: 'weight', text: fill(copy.feed.kg, { value: formatNumber(item.weightKg, language, { maximumFractionDigits: 1 }) }) });
      }
      if (item.change) {
        const label = item.change.id === 'weight' ? copy.detail.weight : measurementLabel(item.change.id, language);
        chips.push({ id: 'change', text: `${label} ${signed(item.change.delta, language)}` });
      }
      return { ...base, kind: 'measurements', sentence: copy.feed.measurements, chips, tab: 'body' };
    }
    case 'trainee_joined':
      return {
        ...base,
        kind: 'joined',
        sentence: item.onboardingStatus === 'completed' ? copy.feed.joinedDone : copy.feed.joined,
        tab: 'body',
        questionnaireCta: item.onboardingStatus === 'completed',
      };
  }
}

/** The amber card's sentence for a trainee who needs attention. */
export function attentionSentence(trainee: CoachTraineeSummary, copy: CoachCopy, language: Language): string | null {
  const attention = trainee.attention;
  if (!attention) return null;
  return attention.reason === 'no_workout'
    ? formatPlural(language, copy.feed.attentionNoWorkout, attention.days)
    : formatPlural(language, copy.feed.attentionMissed, attention.count);
}

export interface FeedDay<T> {
  date: string;
  items: T[];
}

/** Items grouped by their day in her zone, newest day first (the items come newest first). */
export function groupByDay<T extends { at: string }>(items: T[], timezone: string): FeedDay<T>[] {
  const days: FeedDay<T>[] = [];
  for (const item of items) {
    const date = localDateOf(item.at, timezone);
    const last = days.at(-1);
    if (last && last.date === date) last.items.push(item);
    else days.push({ date, items: [item] });
  }
  return days;
}
