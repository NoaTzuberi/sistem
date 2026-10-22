import { achievementBadgeNumber, describeAchievement, useCopy, useLanguage } from '@sistem/shared';
import type { BadgeEntry } from '@sistem/shared';
import { achievementCategoryClass } from '../../data/achievementCategories';
import { ACHIEVEMENT_ICONS } from '../../data/achievementIcons';
import { Medal } from '../Medal/Medal';
import { achievementCopy } from '../../copy';
import './LatestUnlockTile.css';

/** The white tile on the achievements hero: her most recent unlock, with a small medal. Opens its modal. */
export function LatestUnlockTile({ badge, onOpen }: { badge: BadgeEntry; onOpen: () => void }) {
  const language = useLanguage();
  const copy = useCopy(achievementCopy).board;
  return (
    <button type="button" className={`latest-tile ${achievementCategoryClass(badge.category)}`} onClick={onOpen}>
      <span className="latest-tile-medal">
        <Medal category={badge.category} unlocked fraction={1} number={achievementBadgeNumber(badge.type)} image={ACHIEVEMENT_ICONS[badge.type]} size="small" />
      </span>
      <span className="latest-tile-text">
        <small className="latest-tile-eyebrow">{copy.latestUnlock}</small>
        <b className="latest-tile-title">{describeAchievement(badge.type, language).name}</b>
      </span>
    </button>
  );
}
