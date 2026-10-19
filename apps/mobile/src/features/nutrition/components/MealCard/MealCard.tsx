import type { ReactNode } from 'react';
import type { FoodGroup, NutritionViewMeal } from '@sistem/types';
import { describePortion, describeViewLine, fill, mealPortionList, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { IconChevronRight } from '@tabler/icons-react';
import { nutritionCopy } from '../../copy';
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

/** One meal: its portions per group (the focus), then the coach's options, as written. */
export function MealCard({ meal, onOpenSwaps, hasVegetableSwaps, footer }: MealCardProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const portions = mealPortionList(meal.portions);

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
                className={`meal-card-portion meal-card-portion-${group}`}
                onClick={() => onOpenSwaps(group)}
                aria-label={fill(copy.openSwaps, { label })}
              >
                {label}
              </button>
            );
          })}
          {meal.vegetablesFree &&
            (hasVegetableSwaps ? (
              <button type="button" className="meal-card-portion meal-card-portion-vegetable" onClick={() => onOpenSwaps('vegetable')}>
                {shared.nutrition.vegetablesFree}
              </button>
            ) : (
              <span className="meal-card-portion meal-card-portion-static">{shared.nutrition.vegetablesFree}</span>
            ))}
        </div>
      )}

      {meal.options.map((option) => (
        <section key={option.id} className="meal-card-option" aria-label={option.label}>
          <h3 className="meal-card-option-label" dir="auto">
            <bdi>{option.label}</bdi>
          </h3>
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
      ))}
      {footer}
    </article>
  );
}
