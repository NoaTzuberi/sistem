import { useState } from 'react';
import type { FoodGroup, FoodItem, NutritionIssue } from '@sistem/types';
import { fill, formatKcal, PORTION_GROUPS, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { nutritionCopy } from '../../copy';
import { insertAt, useBuilderUndo } from '../../hooks/useBuilderUndo';
import { duplicateOption, move, newOption } from '../../nutritionDraft';
import type { DraftMeal, DraftOption } from '../../nutritionDraft';
import { IssueList } from '../IssueList/IssueList';
import { MealOptionTabs } from '../MealOptionTabs/MealOptionTabs';
import { OptionPanel } from '../OptionPanel/OptionPanel';
import { PortionStepper } from '../PortionStepper/PortionStepper';
import { VegToggle } from '../VegToggle/VegToggle';
import './MealCard.css';

interface MealCardProps {
  meal: DraftMeal;
  index: number;
  count: number;
  /** Its portions × the group values (live). */
  kcal: number;
  foods: FoodItem[];
  recentFoodIds: Partial<Record<FoodGroup, string[]>>;
  foodsById: Map<string, FoodItem>;
  /** Issues of this meal, from the last save. */
  issues: NutritionIssue[];
  onChange: (meal: DraftMeal) => void;
  onRemove: () => void;
  onMove: (offset: -1 | 1) => void;
}

/** One meal: its color and number, an editable name, kcal, tools, options, portions in ½ steps and free vegetables. */
export function MealCard({ meal, index, count, kcal, foods, recentFoodIds, foodsById, issues, onChange, onRemove, onMove }: MealCardProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const undo = useBuilderUndo();
  const [selected, setSelected] = useState(0);
  const option = meal.options[Math.min(selected, meal.options.length - 1)];
  const optionIndex = option ? meal.options.indexOf(option) : -1;

  function setOption(next: DraftOption) {
    onChange({ ...meal, options: meal.options.map((current, i) => (i === optionIndex ? next : current)) });
  }

  function addOption() {
    const letter = b.optionLetters[meal.options.length] ?? String(meal.options.length + 1);
    onChange({ ...meal, options: [...meal.options, newOption(fill(b.newOptionLabel, { letter }))] });
    setSelected(meal.options.length);
  }

  // No confirm: the meals list offers "Undo" right after.
  function remove() {
    onRemove();
  }

  return (
    <article className="nb-meal" data-tone={index % 4}>
      <header className="nb-meal-top">
        <span className="nb-meal-number" aria-label={fill(b.mealNumber, { number: index + 1 })}>
          {index + 1}
        </span>
        <input className="nb-inline-input nb-meal-name" dir="auto" value={meal.name} aria-label={copy.mealName} onChange={(event) => onChange({ ...meal, name: event.target.value })} />
        <span className="nb-meal-kcal">
          <bdi>{formatKcal(kcal, language)}</bdi>
        </span>
        <div className="nb-meal-tools" role="group" aria-label={b.mealTools}>
          <button className="nb-tool" type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={copy.moveUp}>
            <Icon name="arrowUp" size="sm" />
          </button>
          <button className="nb-tool" type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={copy.moveDown}>
            <Icon name="arrowDown" size="sm" />
          </button>
          <button className="nb-tool nb-tool-delete" type="button" onClick={remove} aria-label={copy.removeMeal}>
            <Icon name="trash" size="sm" />
          </button>
        </div>
      </header>

      <MealOptionTabs options={meal.options} selected={optionIndex} onSelect={setSelected} onAdd={addOption} />

      <div className="nb-meal-portions">
        {PORTION_GROUPS.map((group) => (
          <PortionStepper
            key={group}
            group={group}
            label={shared.nutrition.groups[group]}
            value={meal.portions[group]}
            onChange={(value) => onChange({ ...meal, portions: { ...meal.portions, [group]: value } })}
          />
        ))}
        <VegToggle label={copy.vegetablesFree} checked={meal.vegetablesFree} onChange={(vegetablesFree) => onChange({ ...meal, vegetablesFree })} />
      </div>
      <IssueList issues={issues.filter((issue) => issue.optionIndex === undefined)} />

      {option && (
        <OptionPanel
          meal={meal}
          option={option}
          canMoveUp={optionIndex > 0}
          foods={foods}
          recentFoodIds={recentFoodIds}
          foodsById={foodsById}
          issues={issues.filter((issue) => issue.optionIndex === optionIndex)}
          onChange={setOption}
          onMoveUp={() => {
            onChange({ ...meal, options: move(meal.options, optionIndex, -1) });
            setSelected(optionIndex - 1);
          }}
          onRemove={() => {
            const removed = meal.options[optionIndex];
            onChange({ ...meal, options: meal.options.filter((_, i) => i !== optionIndex) });
            setSelected(Math.max(0, optionIndex - 1));
            if (removed && undo) {
              undo.offer(fill(b.optionRemoved, { name: removed.label }), meal.key, (current) => ({
                ...current,
                options: insertAt(current.options, optionIndex, removed),
              }));
            }
          }}
          onDuplicate={() => {
            const letter = b.optionLetters[meal.options.length] ?? String(meal.options.length + 1);
            onChange({ ...meal, options: [...meal.options, duplicateOption(option, fill(b.newOptionLabel, { letter }))] });
            setSelected(meal.options.length);
          }}
        />
      )}
    </article>
  );
}
