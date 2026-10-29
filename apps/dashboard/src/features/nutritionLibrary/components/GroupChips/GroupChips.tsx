import type { FoodGroup } from '@sistem/types';
import { FOOD_GROUPS, sharedCopy, useCopy } from '@sistem/shared';
import { GroupFilterChip } from '../../../nutrition/components/GroupFilterChip/GroupFilterChip';
import { nutritionLibraryCopy } from '../../copy';
import './GroupChips.css';

interface GroupChipsProps {
  value: FoodGroup | null;
  counts: { all: number; byGroup: Record<FoodGroup, number> };
  onChange: (group: FoodGroup | null) => void;
}

/** "All groups" + one chip per group with its icon and count — the food list's group filter. */
export function GroupChips({ value, counts, onChange }: GroupChipsProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionLibraryCopy);
  return (
    <div className="group-chips" role="group" aria-label={copy.groupsLabel}>
      <GroupFilterChip group={null} isSelected={value === null} onClick={() => onChange(null)}>
        {copy.allGroups}
        <span className="group-chip-count">{counts.all}</span>
      </GroupFilterChip>
      {FOOD_GROUPS.map((group) => (
        <GroupFilterChip key={group} group={group} isSelected={value === group} onClick={() => onChange(group)}>
          {shared.nutrition.groups[group]}
          <span className="group-chip-count">{counts.byGroup[group]}</span>
        </GroupFilterChip>
      ))}
    </div>
  );
}
