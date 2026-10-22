import { achievementBadgeNumber, describeAchievement, formatUnlockedDate, useCopy, useLanguage } from '@sistem/shared';
import { achievementCategoryClass } from '../../data/achievementCategories';
import type { BadgeEntry } from '@sistem/shared';
import { Medal } from '../Medal/Medal';
import { traineesCopy } from '../../copy';
import './LatestUnlockCard.css';

/** The white card on the achievements hero: her most recent unlock. Opens its modal. */
export function LatestUnlockCard({ badge, onOpen }: { badge: BadgeEntry; onOpen: () => void }) {
  const language = useLanguage();
  const copy = useCopy(traineesCopy).achievementsTab;
  return (
    <button type="button" className={`latest-unlock ${achievementCategoryClass(badge.category)}`} onClick={onOpen}>
      <Medal category={badge.category} unlocked fraction={1} number={achievementBadgeNumber(badge.type)} size="small" />
      <span className="latest-unlock-text">
        <small className="latest-unlock-eyebrow">{copy.latestUnlock}</small>
        <b className="latest-unlock-title">{describeAchievement(badge.type, language).name}</b>
        {badge.progress.unlockedAt && <small className="latest-unlock-date">{formatUnlockedDate(badge.progress.unlockedAt, language)}</small>}
      </span>
    </button>
  );
}
