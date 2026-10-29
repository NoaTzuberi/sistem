import type { FoodGroup } from '@sistem/types';
import { sharedCopy, useCopy } from '@sistem/shared';
import { GroupFilterChip } from '../GroupFilterChip/GroupFilterChip';
import './GroupTabs.css';

interface GroupTabsProps<T extends FoodGroup | null> {
  groups: readonly T[];
  value: T;
  onChange: (group: T) => void;
  label: string;
  /** Text for the null entry (e.g. "All groups"). */
  allLabel?: string;
}

/** One row of group chips (single-select) — the food picker's groups. */
export function GroupTabs<T extends FoodGroup | null>({ groups, value, onChange, label, allLabel }: GroupTabsProps<T>) {
  const shared = useCopy(sharedCopy);
  return (
    <div className="group-tabs" role="group" aria-label={label}>
      {groups.map((group) => (
        <GroupFilterChip key={group ?? 'all'} group={group} isSelected={value === group} onClick={() => onChange(group)}>
          {group === null ? allLabel : shared.nutrition.groups[group]}
        </GroupFilterChip>
      ))}
    </div>
  );
}
