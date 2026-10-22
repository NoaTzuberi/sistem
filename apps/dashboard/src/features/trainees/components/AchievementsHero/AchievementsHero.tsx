import type { CSSProperties } from 'react';
import type { StreakSummary } from '@sistem/types';
import { achievementCountLabel, describeAchievement, fill, formatNumber, formatVolume, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { useCountUp } from '../../../stats/hooks/useCountUp';
import type { AchievementBoard } from '@sistem/shared';
import { remainingToUnlock } from '@sistem/shared';
import { LatestUnlockCard } from '../LatestUnlockCard/LatestUnlockCard';
import { StreakCard } from '../StreakCard/StreakCard';
import { traineesCopy } from '../../copy';
import './AchievementsHero.css';

interface AchievementsHeroProps {
  board: AchievementBoard;
  streak: StreakSummary;
  /** No completed workout yet: the first badge "unlocks with the first workout". */
  noWorkoutsYet: boolean;
  /** The number counts up and the XP bar grows (first view only). */
  intro: boolean;
  onOpen: (badge: AchievementBoard['badges'][number]) => void;
}

/** The pink hero of the Achievements tab: how many are unlocked, an XP bar, what is next, her streak and her latest unlock. */
export function AchievementsHero({ board, streak, noWorkoutsYet, intro, onOpen }: AchievementsHeroProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy).achievementsTab;
  const total = board.badges.length;
  const shown = useCountUp(board.unlockedCount, intro);
  const { next } = board;
  const remaining = next ? remainingToUnlock(next) : null;
  const nextNote = noWorkoutsYet
    ? copy.unlocksWithFirstWorkout
    : remaining === null
      ? null
      : fill(copy.remaining, { amount: next?.type.startsWith('volume') ? formatVolume(remaining, language) : formatNumber(remaining, language) });

  return (
    <section className="ach-hero" aria-label={shared.coach.tabs.achievements}>
      <div className="ach-hero-main">
        <span className="ach-hero-eyebrow">{shared.coach.tabs.achievements}</span>
        <p className="ach-hero-count">
          <b className="ach-hero-number">{formatNumber(Math.round(shown), language)}</b>
          <span>{fill(copy.unlockedOf, { total: formatNumber(total, language) })}</span>
        </p>
        <div
          className="ach-hero-xp"
          role="progressbar"
          aria-label={achievementCountLabel(board.badges.map((badge) => badge.progress), language)}
          aria-valuemin={0} aria-valuemax={total} aria-valuenow={board.unlockedCount}>
          {/* A computed value, not styling: the share unlocked. */}
          <span
            className={intro ? 'ach-hero-xp-fill is-intro' : 'ach-hero-xp-fill'}
            style={{ '--xp': total > 0 ? board.unlockedCount / total : 0 } as CSSProperties}
          />
        </div>
        {next && (
          <p className="ach-hero-next">
            {copy.nextLabel} <b>{describeAchievement(next.type, language).name}</b>
            {nextNote && ` · ${nextNote}`}
          </p>
        )}
      </div>
      <div className="ach-hero-side">
        <StreakCard streak={streak} />
        {board.latest && <LatestUnlockCard badge={board.latest} onOpen={() => board.latest && onOpen(board.latest)} />}
      </div>
    </section>
  );
}
