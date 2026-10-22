import type { CSSProperties } from 'react';
import type { StreakSummary } from '@sistem/types';
import { achievementCountLabel, describeAchievement, fill, formatNumber, formatVolume, remainingToUnlock, useCopy, useLanguage } from '@sistem/shared';
import type { AchievementBoard, BadgeEntry } from '@sistem/shared';
import { profileCopy } from '../../../profile/copy';
import { useCountUp } from '../../hooks/useCountUp';
import { LatestUnlockTile } from '../LatestUnlockTile/LatestUnlockTile';
import { StreakTile } from '../StreakTile/StreakTile';
import { achievementCopy } from '../../copy';
import './AchievementsHero.css';

interface AchievementsHeroProps {
  board: AchievementBoard;
  streak: StreakSummary;
  /** No completed workout yet: the first badge "unlocks with the first workout". */
  noWorkoutsYet: boolean;
  onOpen: (badge: BadgeEntry) => void;
}

/**
 * The pink hero of Profile → Achievements (the dashboard's achievements hero, for the phone): how many are
 * unlocked (counting up on open), the glowing XP bar, what is next, her streak and her latest unlock.
 */
export function AchievementsHero({ board, streak, noWorkoutsYet, onOpen }: AchievementsHeroProps) {
  const language = useLanguage();
  const copy = useCopy(achievementCopy).board;
  const profile = useCopy(profileCopy);
  const total = board.badges.length;
  const shown = useCountUp(board.unlockedCount);
  const { next, latest } = board;
  const remaining = next ? remainingToUnlock(next) : null;
  const nextNote = noWorkoutsYet
    ? copy.unlocksWithFirstWorkout
    : remaining === null
      ? null
      : fill(copy.remaining, { amount: next?.type.startsWith('volume') ? formatVolume(remaining, language) : formatNumber(remaining, language) });

  return (
    <section className="ach-hero" aria-label={profile.tabs.achievements}>
      <span className="ach-hero-eyebrow" aria-hidden="true">
        {profile.eyebrow.achievements}
      </span>
      <p className="ach-hero-count">
        <b className="ach-hero-number">{formatNumber(shown, language)}</b>
        <span>{fill(copy.unlockedOf, { total: formatNumber(total, language) })}</span>
      </p>
      <div
        className="ach-hero-xp"
        role="progressbar"
        aria-label={achievementCountLabel(board.badges.map((badge) => badge.progress), language)}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={board.unlockedCount}
      >
        {/* A computed value, not styling: the share unlocked. */}
        <span className="ach-hero-xp-fill" style={{ '--xp': total > 0 ? board.unlockedCount / total : 0 } as CSSProperties} />
      </div>
      {next && (
        <p className="ach-hero-next">
          {copy.nextLabel} <b>{describeAchievement(next.type, language).name}</b>
          {nextNote && ` · ${nextNote}`}
        </p>
      )}
      <div className="ach-hero-tiles">
        <StreakTile streak={streak} />
        {latest && <LatestUnlockTile badge={latest} onOpen={() => onOpen(latest)} />}
      </div>
    </section>
  );
}
