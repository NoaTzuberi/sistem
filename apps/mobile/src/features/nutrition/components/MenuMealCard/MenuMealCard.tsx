import { useState } from 'react';
import type { FoodGroup, NutritionViewMeal, PortionGroup } from '@sistem/types';
import { describeViewLine, PORTION_GROUPS, useCopy, useLanguage } from '@sistem/shared';
import { IconArrowsExchange, IconCheck } from '@tabler/icons-react';
import { PortionNumber } from '../PortionNumber/PortionNumber';
import { nutritionCopy } from '../../copy';
import '../../groupColors.css';
import './MenuMealCard.css';

interface MenuMealCardProps {
  meal: NutritionViewMeal;
  marked: boolean;
  /** Null = "I ate this" is not offered (a locked day, or a meal that wasn't in that day's plan). */
  onToggleEaten: (() => void) | null;
  onOpenFoods: (group: FoodGroup) => void;
}

function isPortionGroup(group: FoodGroup | null): group is PortionGroup {
  return group !== null && (PORTION_GROUPS as readonly string[]).includes(group);
}

/** One meal of the coach's menu: name, "I ate this", option tabs and the option's items, each swappable. */
export function MenuMealCard({ meal, marked, onToggleEaten, onOpenFoods }: MenuMealCardProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy);
  const [optionIndex, setOptionIndex] = useState(0);
  const option = meal.options[Math.min(optionIndex, meal.options.length - 1)];

  return (
    <article className="tn-meal">
      <div className="tn-meal-head">
        <h3 className="tn-meal-name" dir="auto">
          <bdi>{meal.name}</bdi>
        </h3>
        {onToggleEaten && (
          <button
            type="button"
            className={'tn-meal-eaten' + (marked ? ' tn-meal-eaten-on' : '')}
            aria-pressed={marked}
            onClick={onToggleEaten}
          >
            {marked && <IconCheck size={14} stroke={2.4} aria-hidden="true" />}
            {marked ? copy.mealEaten : copy.mealAte}
          </button>
        )}
      </div>

      {meal.options.length > 1 && (
        <div className="tn-meal-options" role="group" aria-label={meal.name}>
          {meal.options.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              className="tn-meal-option"
              aria-pressed={candidate === option}
              onClick={() => setOptionIndex(index)}
              dir="auto"
            >
              {candidate.label}
            </button>
          ))}
        </div>
      )}

      {option && (
        <ul className="tn-meal-items">
          {option.lines.map((line) => {
            const { title, detail } = describeViewLine(line, language);
            const group = line.food?.group ?? line.group;
            return (
              <li key={line.id} className={'tn-meal-item' + (group ? ` tn-group-${group}` : '')}>
                {line.portions !== null && group ? (
                  <span className="tn-meal-item-count" aria-hidden="true">
                    <PortionNumber value={line.portions} />
                  </span>
                ) : (
                  <span className="tn-meal-item-count tn-meal-item-count-empty" aria-hidden="true" />
                )}
                <span className="tn-meal-item-text" dir="auto">
                  {title}
                  {detail && <small> · {detail}</small>}
                </span>
                {isPortionGroup(group) && (
                  <button type="button" className="tn-meal-item-swap" onClick={() => onOpenFoods(group)}>
                    <IconArrowsExchange size={12} stroke={2.2} aria-hidden="true" />
                    {copy.swapItem}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
