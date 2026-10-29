import type { ReactNode } from 'react';
import type { FoodGroup } from '@sistem/types';
import { GroupIcon } from '../groupIcons';
import './GroupFilterChip.css';

interface GroupFilterChipProps {
  /** null = the "All" chip (soft, ink when chosen). */
  group: FoodGroup | null;
  /** Without an icon: a category of the group (tinted the same way). */
  withIcon?: boolean;
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** One pill of a food filter row: the group's tint + ink, solid group color + white when chosen. */
export function GroupFilterChip({ group, withIcon = true, isSelected, onClick, children }: GroupFilterChipProps) {
  return (
    <button
      type="button"
      className={'group-filter-chip ' + (group === null ? 'group-filter-chip-all' : `food-group-${group}`)}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      {withIcon && group !== null && (
        <span className="group-filter-chip-icon" aria-hidden="true">
          <GroupIcon group={group} />
        </span>
      )}
      {children}
    </button>
  );
}
