import type { AchievementProgress, AchievementType, Language, StreakSummary } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill, formatPlural } from './i18n/copy';
import { isolateLtr } from './i18n/bidi';
import { formatNumber } from './i18n/intl';
import { formatDate } from './format';

// Names and descriptions of the achievements (Phase 11). The server stores only the
// type; both apps build the text here, in the language on screen. PLACEHOLDER wording —
// the owner sends the final copy.

export interface AchievementText {
  name: string;
  description: string;
}

type Counted = { kind: 'workouts' | 'prs' | 'streak'; count: number } | { kind: 'volume'; kg: number };

// The numbered achievements share one wording each; the rest have their own text in the copy.
const COUNTED: Partial<Record<AchievementType, Counted>> = {
  workouts_5: { kind: 'workouts', count: 5 },
  workouts_10: { kind: 'workouts', count: 10 },
  workouts_25: { kind: 'workouts', count: 25 },
  workouts_50: { kind: 'workouts', count: 50 },
  workouts_100: { kind: 'workouts', count: 100 },
  prs_10: { kind: 'prs', count: 10 },
  prs_25: { kind: 'prs', count: 25 },
  prs_50: { kind: 'prs', count: 50 },
  volume_10k: { kind: 'volume', kg: 10_000 },
  volume_50k: { kind: 'volume', kg: 50_000 },
  volume_100k: { kind: 'volume', kg: 100_000 },
  volume_500k: { kind: 'volume', kg: 500_000 },
  volume_1m: { kind: 'volume', kg: 1_000_000 },
  streak_2: { kind: 'streak', count: 2 },
  streak_4: { kind: 'streak', count: 4 },
  streak_8: { kind: 'streak', count: 8 },
  streak_12: { kind: 'streak', count: 12 },
  streak_26: { kind: 'streak', count: 26 },
  streak_52: { kind: 'streak', count: 52 },
};

const NAMED = ['first_workout', 'first_weight_pr', 'first_reps_pr', 'perfect_week', 'comeback', 'first_pump_photo', 'first_measurement', 'first_progress_photo', 'weigh_ins_10'] as const;
type NamedAchievement = (typeof NAMED)[number];

function isNamed(type: AchievementType): type is NamedAchievement {
  return (NAMED as readonly string[]).includes(type);
}

export function describeAchievement(type: AchievementType, language: Language): AchievementText {
  const copy = sharedCopy[language].achievements;
  if (isNamed(type)) return copy[type];
  const counted = COUNTED[type];
  if (!counted) return { name: type, description: '' };
  if (counted.kind === 'volume') {
    const amount = formatNumber(counted.kg, language);
    return { name: fill(copy.volumeName, { amount }), description: fill(copy.volumeDescription, { amount }) };
  }
  const vars = { count: counted.count };
  const [name, description] =
    counted.kind === 'workouts'
      ? [copy.workoutsName, copy.workoutsDescription]
      : counted.kind === 'prs'
        ? [copy.prsName, copy.prsDescription]
        : [copy.streakName, copy.streakDescription];
  return { name: fill(name, vars), description: fill(description, vars) };
}

/** '7 Oct 2026' — when an achievement was unlocked, in the viewer's zone. */
export function formatUnlockedDate(iso: string, language: Language): string {
  return formatDate(iso, language);
}

/** '3 weeks' / '1 week'. */
export function streakWeeksLabel(weeks: number, language: Language): string {
  return formatPlural(language, sharedCopy[language].achievements.streakWeeks, weeks);
}

/** This week's progress: '2 / 3 workouts', or null without a plan. */
export function streakWeekLabel(streak: StreakSummary, language: Language): string | null {
  return streak.thisWeek
    ? fill(sharedCopy[language].achievements.weekProgress, {
        progress: isolateLtr(`${streak.thisWeek.done} / ${streak.thisWeek.planned}`),
      })
    : null;
}

/** 0–1 for the streak ring: this week's done / planned. */
export function streakWeekFraction(streak: StreakSummary): number {
  return streak.thisWeek ? Math.min(1, streak.thisWeek.done / streak.thisWeek.planned) : 0;
}

const VOLUME_TYPES: ReadonlySet<AchievementType> = new Set(['volume_10k', 'volume_50k', 'volume_100k', 'volume_500k', 'volume_1m']);

/** A lifetime-volume (kg) achievement. */
export function isVolumeAchievement(type: AchievementType): boolean {
  return VOLUME_TYPES.has(type);
}

/** '12,400 kg' */
export function formatVolume(kg: number, language: Language): string {
  return `${formatNumber(Math.round(kg), language)} ${sharedCopy[language].units.kg}`;
}

/** A locked one-time achievement: '7 / 10', '4,000 / 10,000 kg'; repeatable: '×3' or null. */
export function describeAchievementProgress(progress: AchievementProgress, language: Language): string | null {
  if (progress.repeatable || progress.threshold === undefined) {
    return progress.count > 0 ? `×${progress.count}` : null;
  }
  const current = Math.min(progress.current, progress.threshold);
  if (VOLUME_TYPES.has(progress.type)) {
    // The numbers stay left to right; the unit follows them in the reading direction.
    return `${isolateLtr(`${formatNumber(Math.round(current), language)} / ${formatNumber(progress.threshold, language)}`)} ${sharedCopy[language].units.kg}`;
  }
  return isolateLtr(`${current} / ${progress.threshold}`);
}

/** 0–1 towards a one-time achievement (repeatable: 1 once unlocked). */
export function achievementProgressFraction(progress: AchievementProgress): number {
  if (progress.count > 0) return 1;
  if (progress.repeatable || !progress.threshold) return 0;
  return Math.min(1, progress.current / progress.threshold);
}

/** '3 of 28 unlocked' — repeatables count once. */
export function achievementCountLabel(progress: AchievementProgress[], language: Language): string {
  const unlocked = progress.filter((entry) => entry.count > 0).length;
  return fill(sharedCopy[language].achievements.unlockedCount, { unlocked, total: progress.length });
}
