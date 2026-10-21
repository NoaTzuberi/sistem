import type { CoachNutritionPlan, NutritionConfig } from '@sistem/types';
import { fill, formatDateTime, formatKcal, formatPlural, nutritionGoalLabel, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Tag } from '../../../../components/common/Tag/Tag';
import { groupShares } from '../../data/nutritionSummary';
import { CaloriesMacroRing } from '../CaloriesMacroRing/CaloriesMacroRing';
import { MacroBars } from '../MacroBars/MacroBars';
import { MealsList } from '../MealsList/MealsList';
import { nutritionCopy } from '../../copy';
import './CurrentNutritionPlanCard.css';

interface CurrentNutritionPlanCardProps {
  plan: CoachNutritionPlan;
  config: NutritionConfig;
  builderPath: string;
}

/**
 * Her nutrition plan at a glance (the coach's working copy): its goal, where it stands, the day's
 * kcal split by portion group, and the meals (menu mode) — with the way into the nutrition builder.
 */
export function CurrentNutritionPlanCard({ plan, config, builderPath }: CurrentNutritionPlanCardProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const isPublished = plan.publishedVersion > 0 && plan.publishedAt !== null;
  const isPortions = plan.mode === 'portions';
  const status = !isPublished ? shared.coach.planStatus.draft : plan.changedSincePublish ? copy.statusChanged : shared.coach.planStatus.published;
  const meta = [
    isPublished && plan.publishedAt
      ? fill(copy.statusPublished, { version: plan.publishedVersion, date: formatDateTime(plan.publishedAt, language) })
      : copy.statusNever,
    // Portions mode: she gets daily portions, not meals (owner, 2026-10-20).
    isPortions
      ? copy.builder.modePortions
      : plan.meals.length > 0
        ? fill(copy.tab.mealsADay, { meals: formatPlural(language, shared.nutrition.meals, plan.meals.length) })
        : null,
  ].filter(Boolean);
  const shares = groupShares(plan.dayPortions, config.groupKcal);

  return (
    <section className="nutrition-plan-card" aria-labelledby="nutrition-plan-title">
      <header className="nutrition-plan-head">
        <div className="nutrition-plan-heading">
          <span className="nutrition-plan-eyebrow">{copy.tab.currentPlan}</span>
          <h2 className="nutrition-plan-title" id="nutrition-plan-title">
            {nutritionGoalLabel(plan.calorieTarget.goal, language)}
          </h2>
          <p className="nutrition-plan-meta">{meta.join(' · ')}</p>
          {plan.calorieTarget.kcal !== null && (
            <p className="nutrition-plan-meta">
              {copy.targetTitle}: <bdi>{formatKcal(plan.calorieTarget.kcal, language)}</bdi>
            </p>
          )}
        </div>
        <Tag tone={isPublished && !plan.changedSincePublish ? 'accent' : 'neutral'}>{status}</Tag>
      </header>

      {!isPortions && plan.meals.length === 0 ? (
        <p className="nutrition-plan-empty">{copy.noMeals}</p>
      ) : (
        <>
          {plan.kcal.day > 0 && (
            <div className="nutrition-plan-body">
              <CaloriesMacroRing kcal={plan.kcal.day} shares={shares} />
              <MacroBars shares={shares} />
            </div>
          )}
          {!isPortions && <MealsList meals={plan.meals} kcal={plan.kcal} />}
        </>
      )}

      <div className="nutrition-plan-actions">
        <PillButton variant="primary" to={builderPath}>
          {copy.tab.editInBuilder}
        </PillButton>
        <PillButton to={builderPath}>
          <Icon name="plus" size="sm" />
          {copy.tab.newPlan}
        </PillButton>
      </div>
    </section>
  );
}
