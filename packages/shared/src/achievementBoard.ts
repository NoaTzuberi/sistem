import type { AchievementOverview, AchievementProgress, AchievementType } from '@sistem/types';
import { ACHIEVEMENT_CATEGORIES, achievementCategory, achievementProgressFraction } from './achievementDisplay';
import type { AchievementCategory } from './achievementDisplay';

// The achievements board, read from GET /api/achievements (trainee) or …/trainees/:id/achievements (coach).
// Pure: what is unlocked, what is next, what each group shows. Everything is computed by the server;
// this only arranges it. Used by the dashboard's Achievements tab and the trainee's Profile tab.

export type AchievementFilter = 'all' | 'unlocked' | 'locked';

export interface BadgeEntry {
  type: AchievementType;
  progress: AchievementProgress;
  category: AchievementCategory;
  unlocked: boolean;
  /** 0–1 towards it (1 once unlocked). */
  fraction: number;
}

export interface AchievementBoard {
  badges: BadgeEntry[];
  unlockedCount: number;
  /** The locked badge closest to unlocking (ties: the config order); null when all are unlocked. */
  next: BadgeEntry | null;
  /** The most recently unlocked one; null before the first. */
  latest: BadgeEntry | null;
}

export function buildAchievementBoard(overview: Pick<AchievementOverview, 'progress' | 'unlocked'>): AchievementBoard {
  const badges = overview.progress.map((progress) => ({
    type: progress.type,
    progress,
    category: achievementCategory(progress.type),
    unlocked: progress.count > 0,
    fraction: achievementProgressFraction(progress),
  }));
  const locked = badges.filter((badge) => !badge.unlocked);
  const next = locked.reduce<BadgeEntry | null>((best, badge) => (best === null || badge.fraction > best.fraction ? badge : best), null);
  const latestType = overview.unlocked[0]?.type;
  return {
    badges,
    unlockedCount: badges.length - locked.length,
    next,
    latest: badges.find((badge) => badge.type === latestType && badge.unlocked) ?? null,
  };
}

/** What is left to the next badge (threshold − now); null for a repeatable one (it has no target). */
export function remainingToUnlock(badge: BadgeEntry): number | null {
  const { threshold, current } = badge.progress;
  return threshold === undefined ? null : Math.max(0, threshold - current);
}

export function filterBadges(badges: BadgeEntry[], filter: AchievementFilter): BadgeEntry[] {
  if (filter === 'all') return badges;
  return badges.filter((badge) => badge.unlocked === (filter === 'unlocked'));
}

/** The filtered badges by category, in display order; empty groups are left out. */
export function groupBadges(badges: BadgeEntry[]): { category: AchievementCategory; badges: BadgeEntry[]; unlocked: number }[] {
  return ACHIEVEMENT_CATEGORIES.flatMap((category) => {
    const inGroup = badges.filter((badge) => badge.category === category);
    return inGroup.length > 0 ? [{ category, badges: inGroup, unlocked: inGroup.filter((badge) => badge.unlocked).length }] : [];
  });
}
