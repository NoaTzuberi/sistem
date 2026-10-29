import type { FoodCategory, FoodGroup } from '@sistem/types';
import { FOOD_CATEGORIES, sharedCopy, useCopy } from '@sistem/shared';
import { nutritionCopy } from '../../copy';
import type { CategoryFilter } from '../../data/foodFilters';
import { GroupFilterChip } from '../GroupFilterChip/GroupFilterChip';
import './CategoryChips.css';

interface CategoryChipsProps {
  group: FoodGroup;
  /** The items being filtered (already of `group`) — only categories that have some get a chip. */
  items: readonly { category: FoodCategory | null }[];
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

/** "All" + the group's categories that have items (single-select), in the group's colors. Used by the food picker and the food list. */
export function CategoryChips({ group, items, value, onChange }: CategoryChipsProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const present = FOOD_CATEGORIES[group].filter((category) => items.some((item) => item.category === category));
  const hasNone = items.some((item) => item.category === null);
  if (present.length === 0) return null;

  const chip = (key: string, label: string, chipValue: CategoryFilter) => (
    <GroupFilterChip key={key} group={chipValue === null ? null : group} withIcon={false} isSelected={value === chipValue} onClick={() => onChange(chipValue)}>
      {label}
    </GroupFilterChip>
  );

  return (
    <div className="category-chips" role="group" aria-label={copy.categoryFilter}>
      {chip('all', copy.categoryAll, null)}
      {present.map((category) => chip(category, shared.nutrition.categories[category], category))}
      {hasNone && chip('none', shared.nutrition.noCategory, 'none')}
    </div>
  );
}
