import type { FoodItem } from '@sistem/types';
import { fill, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import type { FoodSection } from '../../hooks/useFoods';
import { FoodCard } from '../FoodCard/FoodCard';
import { nutritionLibraryCopy } from '../../copy';
import './FoodGroupSection.css';

interface FoodGroupSectionProps {
  section: FoodSection;
  onEdit: (item: FoodItem) => void;
  onRemove: (item: FoodItem) => void;
  onRestore: (item: FoodItem) => void;
  onSetHidden?: (item: FoodItem, hidden: boolean) => void;
  onRevert?: (item: FoodItem) => void;
}

/** One group: a heading with its dot, the per-portion cap ("free" for vegetables) and the count, then its cards. */
export function FoodGroupSection({ section, onEdit, onRemove, onRestore, onSetHidden, onRevert }: FoodGroupSectionProps) {
  const { plural } = useI18n();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionLibraryCopy);
  const headingId = `food-group-${section.group}`;
  return (
    <section className={`food-section food-group-${section.group}`} aria-labelledby={headingId}>
      <h2 className="food-section-heading" id={headingId}>
        <span className="food-section-dot" aria-hidden="true" />
        {shared.nutrition.groups[section.group]}
        <span className="food-section-cap">{section.cap > 0 ? fill(copy.capPill, { kcal: section.cap }) : copy.free}</span>
        <span className="food-section-count">{plural(copy.itemCount, section.items.length)}</span>
      </h2>
      {section.items.length === 0 ? (
        <p className="food-section-empty">{copy.emptyGroup}</p>
      ) : (
        <ul className="food-section-grid">
          {section.items.map((item) => (
            <li key={item.id} className="food-section-cell">
              <FoodCard item={item} cap={section.cap} onEdit={onEdit} onRemove={onRemove} onRestore={onRestore} onSetHidden={onSetHidden} onRevert={onRevert} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
