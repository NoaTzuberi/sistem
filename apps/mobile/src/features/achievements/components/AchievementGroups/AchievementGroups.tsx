import type { AchievementType } from '@sistem/types';
import { fill, filterBadges, groupBadges, isolateLtr, useCopy } from '@sistem/shared';
import type { AchievementBoard, AchievementFilter } from '@sistem/shared';
import { achievementCategoryClass } from '../../data/achievementCategories';
import { BadgeCard } from '../BadgeCard/BadgeCard';
import { achievementCopy } from '../../copy';
import './AchievementGroups.css';

interface AchievementGroupsProps {
  board: AchievementBoard;
  filter: AchievementFilter;
  onFilter: (filter: AchievementFilter) => void;
  onOpen: (type: AchievementType) => void;
}

/** The filter chips (all / unlocked / on the way) and the badges grouped by category, three per row. */
export function AchievementGroups({ board, filter, onFilter, onOpen }: AchievementGroupsProps) {
  const copy = useCopy(achievementCopy).board;
  const total = board.badges.length;
  const groups = groupBadges(filterBadges(board.badges, filter));
  const chips: { id: AchievementFilter; label: string }[] = [
    { id: 'all', label: fill(copy.filterAll, { count: total }) },
    { id: 'unlocked', label: fill(copy.filterUnlocked, { count: board.unlockedCount }) },
    { id: 'locked', label: fill(copy.filterLocked, { count: total - board.unlockedCount }) },
  ];

  return (
    <div className="ach-groups">
      <div className="ach-filter" role="group" aria-label={copy.filterLabel}>
        {chips.map((chip) => (
          <button key={chip.id} type="button" className="ach-filter-chip" aria-pressed={filter === chip.id} onClick={() => onFilter(chip.id)}>
            {chip.label}
          </button>
        ))}
      </div>
      {groups.length === 0 && <p className="ach-groups-empty">{filter === 'unlocked' ? copy.noneUnlocked : copy.allUnlocked}</p>}
      {groups.map((group) => (
        <section key={group.category} className={`ach-group ${achievementCategoryClass(group.category)}`} aria-labelledby={`ach-group-${group.category}`}>
          <h3 className="ach-group-title" id={`ach-group-${group.category}`}>
            <span className="ach-group-dot" aria-hidden="true" />
            {copy.categories[group.category]}
            <span className="ach-group-count">{isolateLtr(`${group.unlocked}/${group.badges.length}`)}</span>
          </h3>
          <div className="ach-group-badges">
            {group.badges.map((badge) => (
              <BadgeCard key={badge.type} badge={badge} isNext={board.next?.type === badge.type} onOpen={() => onOpen(badge.type)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
