import type { AchievementType } from '@sistem/types';
import { fill, isolateLtr, useCopy } from '@sistem/shared';
import { RangeSegmented } from '../../../stats/components/RangeSegmented/RangeSegmented';
import { achievementCategoryClass } from '../../data/achievementCategories';
import { filterBadges, groupBadges } from '@sistem/shared';
import type { AchievementBoard, AchievementFilter } from '@sistem/shared';
import { BadgeCard } from '../BadgeCard/BadgeCard';
import { traineesCopy } from '../../copy';
import './AchievementGrid.css';

interface AchievementGridProps {
  board: AchievementBoard;
  filter: AchievementFilter;
  onFilter: (filter: AchievementFilter) => void;
  onOpen: (type: AchievementType) => void;
}

/** "All achievements": the filter (all / unlocked / on the way) and the badges grouped by category. */
export function AchievementGrid({ board, filter, onFilter, onOpen }: AchievementGridProps) {
  const copy = useCopy(traineesCopy).achievementsTab;
  const total = board.badges.length;
  const groups = groupBadges(filterBadges(board.badges, filter));

  return (
    <section className="ach-grid" aria-labelledby="ach-grid-title">
      <div className="ach-grid-bar">
        <h3 className="ach-grid-title" id="ach-grid-title">
          {copy.allTitle}
        </h3>
        <RangeSegmented
          label={copy.filterLabel}
          size="compact"
          options={[
            { id: 'all', label: fill(copy.filterAll, { count: total }) },
            { id: 'unlocked', label: fill(copy.filterUnlocked, { count: board.unlockedCount }) },
            { id: 'locked', label: fill(copy.filterLocked, { count: total - board.unlockedCount }) },
          ]}
          value={filter}
          onChange={onFilter}
        />
      </div>
      {groups.length === 0 && <p className="ach-grid-empty">{filter === 'unlocked' ? copy.noneUnlocked : copy.allUnlocked}</p>}
      {groups.map((group) => (
        <section key={group.category} className={`ach-grid-group ${achievementCategoryClass(group.category)}`} aria-labelledby={`ach-group-${group.category}`}>
          <h4 className="ach-grid-group-title" id={`ach-group-${group.category}`}>
            <span className="ach-grid-group-dot" aria-hidden="true" />
            {copy.categories[group.category]}
            <span className="ach-grid-group-count">{isolateLtr(`${group.unlocked}/${group.badges.length}`)}</span>
          </h4>
          <div className="ach-grid-badges">
            {group.badges.map((badge) => (
              <BadgeCard key={badge.type} badge={badge} isNext={board.next?.type === badge.type} onOpen={() => onOpen(badge.type)} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
