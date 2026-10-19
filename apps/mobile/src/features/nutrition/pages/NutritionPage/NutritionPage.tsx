import { useCopy, getActiveLanguage } from '@sistem/shared';
import { useCallback, useEffect, useState } from 'react';
import type { TraineeNutritionPlanResponse } from '@sistem/types';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useAuth } from '../../../../services/auth/AuthContext';
import { getNutritionPlan, markNutritionIntroSeen } from '../../../../services/nutrition/nutritionService';
import { NutritionPlanView } from '../../components/NutritionPlanView/NutritionPlanView';
import { PortionTracker } from '../../components/PortionTracker/PortionTracker';
import { MealPhotoField } from '../../components/MealPhotoField/MealPhotoField';
import { useMealTracker } from '../../hooks/useMealTracker';
import { loadNutritionCache, saveNutritionCache } from '../../data/nutritionCache';
import { nutritionCopy } from '../../copy';
import './NutritionPage.css';

// Trainee Nutrition tab (PRD §5.6): her coach's newest published plan, the coach's note,
// and today's portion tracker (13a+). Portions are the focus — calorie numbers never
// reach this screen (the server doesn't send them). The last plan is kept on the phone,
// so the tab and the tracker work without a connection.
export function NutritionPage() {
  const copy = useCopy(nutritionCopy);
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  return (
    <AppShell>
      <div className="nutrition-page">
        <h1 className="nutrition-page-title display-title">{copy.title}</h1>
        <NutritionContent key={userId} userId={userId} />
      </div>
    </AppShell>
  );
}

function NutritionContent({ userId }: { userId: string }) {
  const copy = useCopy(nutritionCopy);
  const [data, setData] = useState<TraineeNutritionPlanResponse | null>(() => loadNutritionCache(userId).plan);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tracker = useMealTracker(userId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const today = tracker.today;
  const date = selectedDate ?? today;
  const day = tracker.days.find((candidate) => candidate.date === date);
  const plan = data?.plan ?? null;
  const version = plan?.version;

  const handleIntroRead = useCallback(() => {
    if (version === undefined || !data?.introUnseen) return;
    // Best effort: if it fails, the note simply opens once more next time.
    markNutritionIntroSeen(version).catch(() => undefined);
    const cached = loadNutritionCache(userId).plan;
    if (cached) saveNutritionCache(userId, { plan: { ...cached, introUnseen: false } });
  }, [data?.introUnseen, userId, version]);

  if (!data && isLoading) return <StateMessage>{copy.loading}</StateMessage>;
  if (!data) return <StateMessage onRetry={() => void load()}>{error}</StateMessage>;
  if (!plan) return <StateMessage>{copy.empty}</StateMessage>;

  return (
    <NutritionPlanView
      plan={plan}
      introInitiallyOpen={data.introUnseen}
      onIntroRead={handleIntroRead}
      renderHeader={(openSwaps) =>
        today && date && day ? (
          <PortionTracker
            days={tracker.days}
            date={date}
            today={today}
            onSelectDate={setSelectedDate}
            onChange={tracker.setEaten}
            onOpenSwaps={openSwaps}
            vegetablesFree={plan.meals.some((meal) => meal.vegetablesFree)}
            hasVegetableSwaps={plan.swaps.vegetable.length > 0}
            sync={tracker.sync}
            offline={tracker.loadFailed}
          />
        ) : null
      }
      renderMealFooter={(meal) =>
        // A photo slot only for a meal that was in that day's plan.
        day && day.meals.some((candidate) => candidate.id === meal.id) ? (
          <MealPhotoField
            date={day.date}
            mealId={meal.id}
            mealName={meal.name}
            photo={day.photos.find((photo) => photo.mealId === meal.id)}
            editable={day.editable}
            onDayChange={tracker.replaceDay}
            onLinkExpired={() => void tracker.reload()}
          />
        ) : null
      }
    />
  );
}
