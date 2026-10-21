import type { FoodGroup, NutritionFoodFacts, PortionGroup } from '@sistem/types';
import { fill, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { IconCheck, IconPlus, IconSearch } from '@tabler/icons-react';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { useFoodsByGroup } from '../../hooks/useFoodsByGroup';
import { GroupBadge } from '../GroupBadge/GroupBadge';
import { GroupIcon } from '../groupIcons';
import { PortionNumber, TextWithNumber } from '../PortionNumber/PortionNumber';
import { nutritionCopy } from '../../copy';
import '../../groupColors.css';
import './FoodSheet.css';

interface FoodSheetProps {
  /** The open group; null = closed. */
  group: FoodGroup | null;
  swaps: Record<FoodGroup, NutritionFoodFacts[]>;
  /** The tabs: the day's planned portion groups. */
  groups: readonly PortionGroup[];
  /** Portions left today in each group (the line under the title). */
  remaining: Record<PortionGroup, number>;
  /** "I ate this" is offered (an editable day with a plan). */
  canMark: boolean;
  query: string;
  marked: ReadonlySet<string>;
  onQueryChange: (query: string) => void;
  onSwitchGroup: (group: FoodGroup) => void;
  onMarkFood: (food: NutritionFoodFacts) => void;
  onClose: () => void;
}

function isPortionGroup(group: FoodGroup): group is PortionGroup {
  return group !== 'vegetable';
}

/**
 * What she can eat from one group (PRD §5.6: any item = one portion): group tabs, a search, the coach's
 * items by category, each with "I ate this" (+1 portion of the group; which food is not stored — PRD 13a+).
 */
export function FoodSheet({ group, swaps, groups, remaining, canMark, query, marked, onQueryChange, onSwitchGroup, onMarkFood, onClose }: FoodSheetProps) {
  const { language, plural } = useI18n();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const shown = group ?? groups[0] ?? 'protein';
  const sections = useFoodsByGroup(swaps, shown, query, language);
  const left = isPortionGroup(shown) ? remaining[shown] : null;

  return (
    <BottomSheet isOpen={group !== null} onClose={onClose} labelledBy="tn-food-sheet-title" className="tn-food-sheet">
      <div className={`tn-food-sheet-top tn-group-${shown}`}>
        <h2 className="tn-food-sheet-title" id="tn-food-sheet-title">
          <GroupBadge group={shown} />
          {shared.nutrition.groups[shown]}
        </h2>
        <p className="tn-food-sheet-line">
          {copy.foodSheetIntro}{' '}
          {left !== null &&
            (left > 0 ? (
              <TextWithNumber text={plural(copy.foodSheetLeft, left, { n: '{n}' })} number={<PortionNumber className="tn-food-sheet-left" value={left} />} />
            ) : (
              copy.doneToday
            ))}
        </p>

        {groups.length > 1 && (
          <div className="tn-food-sheet-tabs" role="group" aria-label={copy.foodSheetLabel}>
            {groups.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tn-food-sheet-tab tn-group-${tab}`}
                aria-pressed={tab === shown}
                onClick={() => onSwitchGroup(tab)}
              >
                <GroupIcon group={tab} />
                {shared.nutrition.groups[tab]}
              </button>
            ))}
          </div>
        )}

        <label className="tn-food-sheet-search">
          <IconSearch size={16} stroke={2} aria-hidden="true" />
          <input type="search" value={query} placeholder={copy.searchFoods} aria-label={copy.searchFoods} onChange={(event) => onQueryChange(event.target.value)} />
        </label>
      </div>

      <div className={`tn-food-sheet-list tn-group-${shown}`}>
        {sections.length === 0 ? (
          <p className="tn-food-sheet-empty">{query.trim() ? copy.searchEmpty : copy.swapsEmpty}</p>
        ) : (
          sections.map((section) => (
            <section key={section.key} aria-label={section.label}>
              <h3 className="tn-food-sheet-category">{section.label}</h3>
              <ul className="tn-food-sheet-foods">
                {section.foods.map((food) => {
                  const isMarked = marked.has(food.id);
                  const canAdd = canMark && isPortionGroup(shown) && (isMarked || (left ?? 0) > 0);
                  return (
                    <li key={food.id} className="tn-food">
                      <span className="tn-food-text">
                        <b dir="auto">
                          <bdi>{food.name}</bdi>
                        </b>
                        <small dir="auto">
                          {fill(copy.portionIs, { amount: food.portion })}
                          {food.grams !== null && !food.portion.includes(String(food.grams)) && ` · ${fill(copy.grams, { grams: food.grams })}`}
                        </small>
                      </span>
                      {canAdd && (
                        <button
                          type="button"
                          className={'tn-food-add' + (isMarked ? ' tn-food-add-on' : '')}
                          disabled={isMarked}
                          onClick={() => onMarkFood(food)}
                          aria-label={`${food.name}: ${isMarked ? copy.foodMarked : copy.foodAte}`}
                        >
                          {isMarked ? <IconCheck size={12} stroke={2.4} aria-hidden="true" /> : <IconPlus size={12} stroke={2.4} aria-hidden="true" />}
                          {isMarked ? copy.foodMarked : copy.foodAte}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </BottomSheet>
  );
}
