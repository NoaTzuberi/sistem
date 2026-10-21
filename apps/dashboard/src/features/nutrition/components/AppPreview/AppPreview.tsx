import { Link } from 'react-router-dom';
import type { FoodItem, PortionCounts } from '@sistem/types';
import { fill, formatPortionCountLtr, PORTION_GROUPS, sharedCopy, useCopy } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { nutritionCopy } from '../../copy';
import './AppPreview.css';

const SHOWN = 4;

interface AppPreviewProps {
  portions: PortionCounts;
  /** The coach's whole food list (archived included); she sees the active items of each group. */
  foods: FoodItem[];
}

/**
 * "What she sees in the app" in portions mode: per group her daily count and the first items she can pick
 * from (as in her swap lists: the coach's active items, in the coach's order), with each one's portion.
 */
export function AppPreview({ portions, foods }: AppPreviewProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;

  return (
    <section className="nm-preview" aria-labelledby="nm-preview-title">
      <header className="nm-preview-head">
        <h3 className="nm-preview-title" id="nm-preview-title">
          {b.appPreviewTitle}
        </h3>
        <Link className="nm-preview-edit" to={ROUTES.NUTRITION_FOODS}>
          {b.editFoods}
        </Link>
      </header>
      <div className="nm-preview-columns">
        {PORTION_GROUPS.map((group) => {
          const items = foods.filter((food) => food.group === group && !food.archivedAt).sort((a, b2) => a.order - b2.order);
          return (
            <div key={group} className="nm-preview-column" data-group={group}>
              <p className="nm-preview-group">
                <span className="nm-preview-dot" aria-hidden="true" />
                {shared.nutrition.groups[group]}
                <b className="nm-preview-count">{formatPortionCountLtr(portions[group])}</b>
              </p>
              {items.length === 0 ? (
                <p className="nm-preview-empty">{b.appPreviewEmpty}</p>
              ) : (
                <ul className="nm-preview-foods">
                  {items.slice(0, SHOWN).map((food) => (
                    <li key={food.id}>
                      <bdi className="nm-preview-name">{food.name}</bdi>
                      <small className="nm-preview-portion" dir="auto">
                        {food.portion}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
              {items.length > SHOWN && <p className="nm-preview-more">{fill(b.previewMore, { count: items.length - SHOWN })}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
