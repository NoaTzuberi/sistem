import { useMemo } from 'react';
import type { FoodGroup, FoodItem, NutritionIssue, NutritionPlanMode, NutritionTemplate, PortionCounts, PortionGroup } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { Toast } from '../../../../components/common/Toast/Toast';
import { appCopy } from '../../../../copy';
import { useUndoToast } from '../../../../hooks/useUndoToast';
import { nutritionCopy } from '../../copy';
import { sectionId } from '../../data/scrollToSection';
import { BuilderUndoContext } from '../../hooks/useBuilderUndo';
import type { BuilderUndo } from '../../hooks/useBuilderUndo';
import { portionsKcal } from '../../hooks/usePortionBudget';
import { move, newMeal } from '../../nutritionDraft';
import type { DraftMeal } from '../../nutritionDraft';
import { DailyPortions } from '../DailyPortions/DailyPortions';
import { MealCard } from '../MealCard/MealCard';
import { ModeCards } from '../ModeCards/ModeCards';
import { StepNumber } from '../StepNumber/StepNumber';
import { TemplatePicker } from '../TemplatePicker/TemplatePicker';
import './MealsSection.css';

interface MealsSectionProps {
  mode: NutritionPlanMode;
  onModeChange: (mode: NutritionPlanMode) => void;
  dailyPortions: PortionCounts;
  /** The day's recommended portions for the target (null while unknown). */
  recommended: PortionCounts | null;
  onDailyChange: (group: PortionGroup, value: number) => void;
  vegetablesFree: boolean;
  onVegetablesChange: (value: boolean) => void;
  proteinGramsTarget: number | null;
  onProteinChange: (value: number | null) => void;
  meals: DraftMeal[];
  onMealsChange: (update: (meals: DraftMeal[]) => DraftMeal[]) => void;
  groupKcal: Record<FoodGroup, number>;
  foods: FoodItem[];
  recentFoodIds: Partial<Record<FoodGroup, string[]>>;
  foodsById: Map<string, FoodItem>;
  issues: NutritionIssue[];
  templates: NutritionTemplate[];
  onApplyTemplate: (templateId: string) => Promise<boolean>;
  /** Step 2's checks are all done: its number turns Cherry with a check. */
  isDone: boolean;
}

/**
 * Step 2, "what she gets" (owner, 2026-10-20): portions only (daily portions per group, she picks the foods)
 * or a full menu (the meals, a template to start from, "+ meal"). Switching keeps both. Deleting a meal, an
 * option or a row is undone from the toast.
 */
export function MealsSection(props: MealsSectionProps) {
  const { mode, onModeChange, dailyPortions, recommended, onDailyChange, vegetablesFree, onVegetablesChange, proteinGramsTarget, onProteinChange } = props;
  const { meals, onMealsChange, groupKcal, foods, recentFoodIds, foodsById, issues, templates, onApplyTemplate, isDone } = props;
  const copy = useCopy(nutritionCopy);
  const app = useCopy(appCopy);
  const { undoMessage, offerUndo, undo } = useUndoToast();

  // Options and rows are deleted inside a meal card; their "Undo" restores into the meal with that key.
  const builderUndo = useMemo<BuilderUndo>(
    () => ({
      offer: (message, mealKey, restore) =>
        offerUndo({ message, onUndo: () => onMealsChange((current) => current.map((meal) => (meal.key === mealKey ? restore(meal) : meal))) }),
    }),
    [offerUndo, onMealsChange],
  );

  // A meal goes at once (the draft autosaves); "Undo" puts it back where it was.
  function removeMeal(index: number) {
    const removed = meals[index];
    if (!removed) return;
    onMealsChange((current) => current.filter((_, i) => i !== index));
    offerUndo({
      message: fill(copy.builder.mealRemoved, { name: removed.name }),
      onUndo: () => onMealsChange((current) => [...current.slice(0, index), removed, ...current.slice(index)]),
    });
  }

  return (
    <section className="nb-card" id={sectionId('meals')} aria-labelledby="nb-meals-title">
      <header className="nb-card-head">
        <StepNumber number={2} isDone={isDone} />
        <h2 className="nb-card-title" id="nb-meals-title" tabIndex={-1}>
          {copy.builder.step2}
        </h2>
        {mode === 'menu' && (
          <div className="nb-card-tools">
            <TemplatePicker templates={templates} onApply={onApplyTemplate} />
          </div>
        )}
      </header>

      <ModeCards mode={mode} onChange={onModeChange} />

      {mode === 'portions' ? (
        <DailyPortions
          portions={dailyPortions}
          recommended={recommended}
          groupKcal={groupKcal}
          vegetablesFree={vegetablesFree}
          foods={foods}
          onChange={onDailyChange}
          onVegetablesChange={onVegetablesChange}
          proteinGramsTarget={proteinGramsTarget}
          onProteinChange={onProteinChange}
        />
      ) : (
        <BuilderUndoContext.Provider value={builderUndo}>
          <div className="nb-meals">
            {meals.length === 0 && <p className="nb-note">{copy.noMeals}</p>}
            {meals.map((meal, index) => (
              <MealCard
                key={meal.key}
                meal={meal}
                index={index}
                count={meals.length}
                kcal={portionsKcal(meal.portions, groupKcal)}
                foods={foods}
                recentFoodIds={recentFoodIds}
                foodsById={foodsById}
                issues={issues.filter((issue) => issue.mealIndex === index)}
                onChange={(next) => onMealsChange((current) => current.map((m, i) => (i === index ? next : m)))}
                onRemove={() => removeMeal(index)}
                onMove={(offset) => onMealsChange((current) => move(current, index, offset))}
              />
            ))}
            <button
              className="nb-add-meal"
              type="button"
              onClick={() => onMealsChange((current) => [...current, newMeal(fill(copy.builder.newMealName, { number: current.length + 1 }))])}
            >
              {copy.addMeal}
            </button>
          </div>
        </BuilderUndoContext.Provider>
      )}
      <Toast message={undoMessage} action={undoMessage ? { label: app.shell.undo, onPress: undo } : undefined} />
    </section>
  );
}
