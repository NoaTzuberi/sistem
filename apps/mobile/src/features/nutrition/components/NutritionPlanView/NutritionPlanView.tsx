import { useState } from 'react';
import type { ReactNode } from 'react';
import type { FoodGroup, NutritionPlanView as PlanView, NutritionViewMeal } from '@sistem/types';
import { formatDateTime, useCopy, useLanguage } from '@sistem/shared';
import { MealCard } from '../MealCard/MealCard';
import { SwapSheet } from '../SwapSheet/SwapSheet';
import { CoachIntro } from '../CoachIntro/CoachIntro';
import { CoachTip } from '../CoachTip/CoachTip';
import { DayTotals } from '../DayTotals/DayTotals';
import { nutritionCopy } from '../../copy';
import './NutritionPlanView.css';

interface OpenSwaps {
  group: FoodGroup;
  foodId?: string;
}

interface NutritionPlanViewProps {
  plan: PlanView;
  /** The coach's note opens while unseen (trainee); coach mode passes nothing (closed). */
  introInitiallyOpen?: boolean;
  onIntroRead?: () => void;
  /** The day header; default = the read-only day totals. The trainee's is her tracker. */
  renderHeader?: (openSwaps: (group: FoodGroup) => void) => ReactNode;
  /** Something under a meal's options (the trainee's meal photo). */
  renderMealFooter?: (meal: NutritionViewMeal) => ReactNode;
}

/**
 * A published nutrition plan as she sees it — the coach's note, the day's portions per
 * group, the meals with the coach's options and tips, and the swap sheet. Also used
 * read-only by coach mode. No calories.
 */
export function NutritionPlanView({ plan, introInitiallyOpen = false, onIntroRead, renderHeader, renderMealFooter }: NutritionPlanViewProps) {
  const language = useLanguage();
  const copy = useCopy(nutritionCopy);
  const [open, setOpen] = useState<OpenSwaps | null>(null);
  const hasVegetableSwaps = plan.swaps.vegetable.length > 0;
  const openGroup = (group: FoodGroup) => setOpen({ group });

  return (
    <div className="nutrition-plan">
      <p className="nutrition-plan-updated">
        {copy.updated} {formatDateTime(plan.publishedAt, language)}
      </p>

      {/* Keyed by version: a new note opens again. */}
      {plan.intro && <CoachIntro key={plan.version} text={plan.intro} initiallyOpen={introInitiallyOpen} onRead={onIntroRead} />}
      {plan.introTip && <CoachTip text={plan.introTip} coachName={null} />}

      {renderHeader ? (
        renderHeader(openGroup)
      ) : (
        <DayTotals
          portions={plan.dayPortions}
          vegetablesFree={plan.meals.some((meal) => meal.vegetablesFree)}
          hasVegetableSwaps={hasVegetableSwaps}
          onOpenSwaps={openGroup}
        />
      )}

      {plan.meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          hasVegetableSwaps={hasVegetableSwaps}
          onOpenSwaps={(group, foodId) => setOpen({ group, foodId })}
          footer={renderMealFooter?.(meal)}
        />
      ))}

      {plan.tips.length > 0 && (
        <section className="nutrition-plan-tips" aria-labelledby="nutrition-plan-tips-title">
          <h2 className="nutrition-plan-tips-title" id="nutrition-plan-tips-title">
            {copy.tipsTitle}
          </h2>
          <ul className="nutrition-plan-tips-list">
            {plan.tips.map((tip, index) => (
              <li key={index} dir="auto">
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SwapSheet group={open?.group ?? null} currentFoodId={open?.foodId} swaps={plan.swaps} onClose={() => setOpen(null)} />
    </div>
  );
}
