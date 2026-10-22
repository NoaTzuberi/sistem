import { achievementBadgeNumber, describeAchievement, describeAchievementProgress, fill, formatUnlockedDate, isolateLtr, useCopy, useLanguage } from '@sistem/shared';
import type { BadgeEntry } from '@sistem/shared';
import { achievementCategoryClass } from '../../data/achievementCategories';
import { ACHIEVEMENT_ICONS } from '../../data/achievementIcons';
import { useTilt } from '../../hooks/useTilt';
import { Medal } from '../Medal/Medal';
import { achievementCopy } from '../../copy';
import './BadgeCard.css';

interface BadgeCardProps {
  badge: BadgeEntry;
  /** The locked badge closest to unlocking: a ring in its color and a small label. */
  isNext: boolean;
  onOpen: () => void;
}

/**
 * One achievement on the board: its medal, name, and the date it was unlocked or how far she is.
 * Leans toward the finger while pressed (useTilt). Opens its modal.
 * MIRROR of apps/dashboard/src/features/trainees/components/BadgeCard — change both. Phone only: the
 * small medal (three columns at 360px).
 */
export function BadgeCard({ badge, isNext, onOpen }: BadgeCardProps) {
  const language = useLanguage();
  const copy = useCopy(achievementCopy).board;
  const tilt = useTilt();
  const { progress } = badge;
  const times = progress.repeatable && progress.count > 1 ? ` · ${isolateLtr(`×${progress.count}`)}` : '';
  const status =
    badge.unlocked && progress.unlockedAt
      ? fill(copy.unlockedShort, { date: formatUnlockedDate(progress.unlockedAt, language) }) + times
      : (describeAchievementProgress(progress, language) ?? copy.notStarted);
  const classes = ['ach-badge', achievementCategoryClass(badge.category), badge.unlocked && 'ach-badge-unlocked', isNext && 'ach-badge-next'];

  return (
    <button type="button" className={classes.filter(Boolean).join(' ')} onClick={onOpen} {...tilt}>
      {isNext && <span className="ach-badge-next-label">{copy.nextUp}</span>}
      <Medal
        category={badge.category}
        unlocked={badge.unlocked}
        fraction={badge.fraction}
        number={achievementBadgeNumber(badge.type)}
        image={ACHIEVEMENT_ICONS[badge.type]}
        size="small"
      />
      <span className="ach-badge-title">{describeAchievement(badge.type, language).name}</span>
      <span className="ach-badge-status">{status}</span>
    </button>
  );
}
