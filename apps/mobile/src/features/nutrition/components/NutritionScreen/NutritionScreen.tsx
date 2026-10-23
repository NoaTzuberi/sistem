import { useCallback, useEffect, useState } from 'react';
import type { NutritionFoodFacts, PortionCounts, PortionGroup, TraineeNutritionPlanResponse } from '@sistem/types';
import { fill, formatPortionCount, getActiveLanguage, PORTION_GROUPS, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { useAuth } from '../../../../services/auth/AuthContext';
import { getNutritionPlan, markNutritionIntroSeen } from '../../../../services/nutrition/nutritionService';
import { loadNutritionCache, saveNutritionCache } from '../../data/nutritionCache';
import { hasFreeVegetables, planMode, sumPortions } from '../../data/nutritionDay';
import { useNutritionDay } from '../../hooks/useNutritionDay';
import { useNutritionSheet } from '../../hooks/useNutritionSheet';
import { NutritionHeader } from '../NutritionHeader/NutritionHeader';
import { WeekStrip } from '../WeekStrip/WeekStrip';
import { CoachCard } from '../CoachCard/CoachCard';
import { PortionSummary } from '../PortionSummary/PortionSummary';
import { PortionGroupRow } from '../PortionGroupRow/PortionGroupRow';
import { FreeVegetables } from '../FreeVegetables/FreeVegetables';
import { MenuSection } from '../MenuSection/MenuSection';
import { MenuMealCard } from '../MenuMealCard/MenuMealCard';
import { MealPhotoStrip } from '../MealPhotoStrip/MealPhotoStrip';
import { MealPhotoSheet } from '../MealPhotoSheet/MealPhotoSheet';
import { OwnTargetSheet } from '../OwnTargetSheet/OwnTargetSheet';
import { SgEmptyState } from '../../../../components/common/SgEmptyState/SgEmptyState';
import { IconTarget } from '@tabler/icons-react';
import { FoodSheet } from '../FoodSheet/FoodSheet';
import { nutritionCopy } from '../../copy';
import './NutritionScreen.css';

const ZERO: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };
const NO_POPS: Record<PortionGroup, number> = { protein: 0, carb: 0, fat: 0, snack: 0 };

/**
 * Trainee Nutrition (PRD §5.6; docs/design/trainee-nutrition.html): her coach's newest published plan and
 * the selected day's portions — the week strip, the coach's note, the day total, one fuel-cell row per
 * group, the menu (menu mode), the day's meal photos, and the food sheet. No calorie numbers ever reach
 * this screen. The plan and the days are kept on the phone, so it works without a connection.
 */
export function NutritionScreen({ userId }: { userId: string }) {
  const { plural } = useI18n();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const [data, setData] = useState<TraineeNutritionPlanResponse | null>(() => loadNutritionCache(userId).plan);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const nutritionDay = useNutritionDay(userId);
  const sheet = useNutritionSheet();
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  // "היעד שלי": without a coach's nutrition plan she tracks against her own daily portions.
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const authUser = useAuth().user;
  const hasCoach = authUser?.coachingStatus != null;
  const timezone = authUser?.timezone ?? 'Asia/Jerusalem';
  const { toastMessage, showToast } = useToast();
  const [pops, setPops] = useState(NO_POPS);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getNutritionPlan();
      saveNutritionCache(userId, { plan: response });
      setData(response);
      setError(null);
    } catch {
      setError(nutritionCopy[getActiveLanguage()].loadError);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const plan = data?.plan ?? null;
  const version = plan?.version;
  const introUnseen = data?.introUnseen ?? false;

  const handleIntroRead = useCallback(() => {
    if (version === undefined || !introUnseen) return;
    // Best effort: if it fails, the note simply opens once more next time.
    markNutritionIntroSeen(version).catch(() => undefined);
    const cached = loadNutritionCache(userId).plan;
    if (cached) saveNutritionCache(userId, { plan: { ...cached, introUnseen: false } });
  }, [introUnseen, userId, version]);

  /** A change that completed groups pops their badges and says so; otherwise its own toast (if any). */
  function celebrate(completed: PortionGroup[], otherwise?: string) {
    if (completed.length > 0) {
      setPops((current) => {
        const next = { ...current };
        for (const group of completed) next[group] += 1;
        return next;
      });
      showToast(fill(copy.groupDoneToast, { group: shared.nutrition.groups[completed[0]] }));
    } else if (otherwise) {
      showToast(otherwise);
    }
  }

  const { day, date } = nutritionDay;
  const ownTarget = nutritionDay.ownTarget;
  // A day tracked against her own target (no coach plan) works like a plan day, without foods.
  const isOwnDay = !plan && day !== null && day.source === 'own';
  const dayHasPlan = day !== null && (day.planVersion !== null || isOwnDay) && sumPortions(day.planned) > 0;
  // Before the days arrive (first open offline): the plan's portions, nothing marked, read-only.
  const planned = day && dayHasPlan ? day.planned : (plan?.dayPortions ?? ZERO);
  const eaten = day && dayHasPlan ? day.eaten : ZERO;
  const canEdit = day !== null && day.editable && dayHasPlan;
  const groups = PORTION_GROUPS.filter((group) => planned[group] > 0);
  const remaining = Object.fromEntries(PORTION_GROUPS.map((group) => [group, Math.max(0, planned[group] - eaten[group])])) as Record<
    PortionGroup,
    number
  >;
  const addPhoto = day && day.editable && day.meals.length > 0 ? () => setIsPhotoSheetOpen(true) : null;
  const showRows = plan !== null && (day === null || dayHasPlan);

  function handleMarkFood(food: NutritionFoodFacts) {
    if (food.group === 'vegetable') return;
    const result = nutritionDay.addPortion(food.group);
    if (!result.added) return;
    sheet.markFood(food.id);
    celebrate(result.completed, fill(copy.foodToast, { group: shared.nutrition.groups[food.group], food: food.name }));
  }

  const syncNote = nutritionDay.offline
    ? copy.trackerOffline
    : nutritionDay.sync === 'pending'
      ? copy.trackerSavedLocally
      : nutritionDay.sync === 'saving'
        ? copy.trackerSaving
        : day && !day.editable && dayHasPlan
          ? copy.trackerReadOnly
          : '';

  return (
    <div className="tn-screen">
      <NutritionHeader date={date} onAddPhoto={(plan || isOwnDay) && addPhoto ? addPhoto : undefined}>
        {(plan || ownTarget) && date && nutritionDay.week.length > 0 && <WeekStrip week={nutritionDay.week} selected={date} onSelect={nutritionDay.selectDate} />}
      </NutritionHeader>

      <div className="tn-body">
        {!data && isLoading ? (
          <StateMessage>{copy.loading}</StateMessage>
        ) : !data ? (
          <StateMessage onRetry={() => void load()}>{error}</StateMessage>
        ) : !plan && ownTarget ? (
          <>
            <div className="sg-own-head">
              <p className="sg-own-label">{copy.ownTarget.trackingLabel}</p>
              <button type="button" className="sg-own-edit" onClick={() => setIsTargetOpen(true)}>
                {copy.ownTarget.edit}
              </button>
            </div>
            {dayHasPlan && day ? (
              <>
                <PortionSummary planned={day.planned} eaten={day.eaten} mode="portions" />
                <ul className="tn-groups">
                  {PORTION_GROUPS.filter((group) => day.planned[group] > 0).map((group) => (
                    <PortionGroupRow
                      key={group}
                      group={group}
                      planned={day.planned[group]}
                      eaten={day.eaten[group]}
                      editable={canEdit}
                      onChange={(value) => celebrate(nutritionDay.setGroup(group, value))}
                      popKey={pops[group]}
                    />
                  ))}
                </ul>
                {ownTarget.freeVegetables && <FreeVegetables />}
              </>
            ) : (
              <p className="tn-note">{copy.trackerNoPlan}</p>
            )}
            <p className="tn-note" role="status">
              {syncNote}
            </p>
            {day && <MealPhotoStrip photos={day.photos} onAdd={addPhoto} onLinkExpired={() => void nutritionDay.reload()} />}
          </>
        ) : !plan ? (
          <>
            {/* Self-guided: no "waiting for your coach" line — one action. With a coach: her line, then the same action. */}
            {hasCoach && <StateMessage>{copy.empty}</StateMessage>}
            <SgEmptyState
              icon={<IconTarget size={24} />}
              title={copy.ownTarget.emptyTitle}
              text={copy.ownTarget.emptyText}
              actionLabel={copy.ownTarget.action}
              onAction={() => setIsTargetOpen(true)}
            />
          </>
        ) : (
          <>
            {/* Keyed by version: a new note opens again. */}
            {plan.intro && (
              <CoachCard key={plan.version} text={plan.intro} coachName={data.coach?.name ?? null} unread={introUnseen} onRead={handleIntroRead} />
            )}

            {showRows ? (
              <>
                <PortionSummary planned={planned} eaten={eaten} mode={planMode(plan)} />
                <ul className="tn-groups">
                  {groups.map((group) => (
                    <PortionGroupRow
                      key={group}
                      group={group}
                      planned={planned[group]}
                      eaten={eaten[group]}
                      editable={canEdit}
                      onChange={(value) => celebrate(nutritionDay.setGroup(group, value))}
                      onOpenFoods={() => sheet.open(group)}
                      popKey={pops[group]}
                    />
                  ))}
                </ul>
                {hasFreeVegetables(plan) && (
                  <FreeVegetables onOpen={plan.swaps.vegetable.length > 0 ? () => sheet.open('vegetable') : undefined} />
                )}
              </>
            ) : (
              <p className="tn-note">{copy.trackerNoPlan}</p>
            )}

            <p className="tn-note" role="status">
              {syncNote}
            </p>

            {planMode(plan) === 'menu' && (
              <MenuSection>
                {plan.meals.map((meal) => {
                  const inDay = canEdit && day !== null && day.meals.some((candidate) => candidate.id === meal.id);
                  return (
                    <MenuMealCard
                      key={meal.id}
                      meal={meal}
                      marked={nutritionDay.dayMarks[meal.id] !== undefined}
                      onToggleEaten={
                        inDay
                          ? () => {
                              const result = nutritionDay.toggleMeal(meal);
                              if (!result.marked) return;
                              celebrate(
                                result.completed,
                                plural(copy.mealToast, result.count, { meal: meal.name, count: formatPortionCount(result.count) }),
                              );
                            }
                          : null
                      }
                      onOpenFoods={sheet.open}
                    />
                  );
                })}
              </MenuSection>
            )}

            {day && <MealPhotoStrip photos={day.photos} onAdd={addPhoto} onLinkExpired={() => void nutritionDay.reload()} />}
          </>
        )}
      </div>

      {plan && (
        <FoodSheet
          group={sheet.group}
          swaps={plan.swaps}
          groups={groups}
          remaining={remaining}
          canMark={canEdit}
          query={sheet.query}
          marked={sheet.marked}
          onQueryChange={sheet.setQuery}
          onSwitchGroup={sheet.switchGroup}
          onMarkFood={handleMarkFood}
          onClose={sheet.close}
        />
      )}
      {day && (
        <MealPhotoSheet
          isOpen={isPhotoSheetOpen}
          onClose={() => setIsPhotoSheetOpen(false)}
          day={day}
          timezone={timezone}
          selfGuided={!hasCoach}
          onDayChange={nutritionDay.replaceDay}
          onLinkExpired={() => void nutritionDay.reload()}
          onToast={showToast}
        />
      )}
      <OwnTargetSheet isOpen={isTargetOpen} onClose={() => setIsTargetOpen(false)} current={ownTarget} onSaved={() => void nutritionDay.reload()} />
      <Toast message={toastMessage} />
    </div>
  );
}
