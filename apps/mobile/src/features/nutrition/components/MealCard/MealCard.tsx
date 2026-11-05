import { useState, type ReactNode } from 'react';
import type { FoodGroup, NutritionViewMeal } from '@sistem/types';
import { describePortion, describeViewLine, fill, mealPortionList, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { IconChevronRight } from '@tabler/icons-react';
import { nutritionCopy } from '../../copy';
import '../../groupColors.css';
import './MealCard.css';

interface MealCardProps {
  meal: NutritionViewMeal;
  /** Tapping a portion (or a food line) opens every swap of its group. */
  onOpenSwaps: (group: FoodGroup, foodId?: string) => void;
  /** Vegetables open a list only when the coach has vegetable items. */
  hasVegetableSwaps: boolean;
  /** Under the options — the trainee's meal photo (13a+). */
  footer?: ReactNode;
}

/** One meal: its portions per group (the focus), then the coach's options as pill chips (one shown at a time, like her menu). */
export function MealCard({ meal, onOpenSwaps, hasVegetableSwaps, footer }: MealCardProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const portions = mealPortionList(meal.portions);
  const [optionIndex, setOptionIndex] = useState(0);
  const option = meal.options[optionIndex] ?? meal.options[0];

  return (
    <article className="meal-card">
      <h2 className="meal-card-name display-title" dir="auto">
        <bdi>{meal.name}</bdi>
      </h2>

      {(portions.length > 0 || meal.vegetablesFree) && (
        <div className="meal-card-portions">
          {portions.map(({ group, count }) => {
            const label = describePortion(group, count, language);
            return (
              <button
                key={group}
                type="button"
                className={`meal-card-portion tn-group-${group}`}
                onClick={() => onOpenSwaps(group)}
                aria-label={fill(copy.openSwaps, { label })}
              >
                {label}
              </button>
            );
          })}
          {meal.vegetablesFree &&
            (hasVegetableSwaps ? (
              <button type="button" className="meal-card-portion tn-group-vegetable" onClick={() => onOpenSwaps('vegetable')}>
                {shared.nutrition.vegetablesFree}
              </button>
            ) : (
              <span className="meal-card-portion meal-card-portion-static">{shared.nutrition.vegetablesFree}</span>
            ))}
        </div>
      )}

      {meal.options.length > 1 && (
        <div className="meal-card-options" role="group" aria-label={meal.name}>
          {meal.options.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              className="meal-card-option-chip"
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
        <section key={option.id} className="meal-card-option" aria-label={option.label}>
          <ul className="meal-card-lines">
            {option.lines.map((line) => {
              const { title, detail } = describeViewLine(line, language);
              const content = (
                <>
                  <span className="meal-card-line-text">
                    <span className="meal-card-line-title" dir="auto">
                      {title}
                    </span>
                    {detail && (
                      <span className="meal-card-line-detail" dir="auto">
                        {detail}
                      </span>
                    )}
                  </span>
                  {line.food && <IconChevronRight className="flip-rtl meal-card-line-icon" size={18} aria-hidden="true" />}
                </>
              );
              return (
                <li key={line.id}>
                  {line.food ? (
                    <button
                      type="button"
                      className="meal-card-line meal-card-line-button"
                      onClick={() => onOpenSwaps(line.food!.group, line.food!.id)}
                      aria-label={`${title} — ${fill(copy.swapsTitle, { group: shared.nutrition.groups[line.food.group] })}`}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="meal-card-line">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {footer}
    </article>
  );
}
