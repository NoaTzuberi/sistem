import { useCallback, useMemo, useState } from 'react';
import type { CoachPlan, CoachTraineeDetail, PlanExercise, PlanWorkout, SavePlanPayload } from '@sistem/types';
import { addDaysToDate, fill, getActiveLanguage, planToSavePayload, withExerciseSwapped, withWorkoutDay } from '@sistem/shared';
import type { ToastAction } from '../../../components/common/Toast/Toast';
import { createPlan, deletePlan, getExerciseFamily, listPlans, savePlan, searchExerciseFamilies } from '../../../services/coach/coachService';
import { coachCopy } from '../copy';
import { dashboardLinks } from '../data/dashboardLinks';

export type QuickEditStep = 'options' | 'move' | 'swapPick' | 'swapReplace';

/** One exercise she can swap to. */
export interface SwapOption {
  exerciseId: string;
  name: string;
  equipment: string[];
}

export interface SwapOptions {
  family: SwapOption[];
  pattern: SwapOption[];
}

const SWAP_SEARCH_LIMIT = 20;

/**
 * "עריכה קלה" on her week: move a workout to another day, swap an exercise (same family or same
 * movement, from the coach's library, her equipment and level), duplicate this week into next week as a
 * DRAFT, or open the dashboard builder. Every change goes through the plan endpoints (the server checks
 * the coaching and the plan rules); move and swap can be undone (the plan as it was is saved back),
 * duplicate by deleting the new draft.
 */
export function usePlanQuickEdit(trainee: CoachTraineeDetail | undefined, today: string, notify: (text: string, action?: ToastAction) => void, onChanged: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [plans, setPlans] = useState<CoachPlan[]>();
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState<QuickEditStep>('options');
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [swapOptions, setSwapOptions] = useState<SwapOptions>();
  const [swapError, setSwapError] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  // Called before her screen loaded (hooks can't wait): nothing opens until she is there.
  const traineeId = trainee?.id ?? '';
  const traineeName = trainee?.name ?? '';
  const weekStart = trainee?.currentWeekStart ?? '';
  const nextWeekStart = addDaysToDate(weekStart, 7);
  // This week's plan (published first: the one she sees).
  const plan = useMemo(() => {
    const week = (plans ?? []).filter((entry) => entry.weekStartDate === weekStart);
    return week.find((entry) => entry.status === 'published') ?? week[0] ?? null;
  }, [plans, weekStart]);
  const workouts = useMemo(() => (plan ? [...plan.workouts].sort((a, b) => a.order - b.order) : []), [plan]);
  const workout = workouts.find((entry) => entry.id === workoutId) ?? null;
  const exercise = workout?.exercises.find((entry) => entry.id === exerciseId) ?? null;
  const isDone = (entry: PlanWorkout) => plan?.progress?.statuses[entry.id] === 'done';
  /** A day of this week that has not passed (her zone); moving into the past would only mark it missed. */
  const isDayOpen = (dayIndex: number) => addDaysToDate(weekStart, dayIndex) >= today;
  const nextWeekTaken = (plans ?? []).some((entry) => entry.weekStartDate === nextWeekStart);
  const dashboardUrl = dashboardLinks.traineePlans(traineeId);

  const loadPlans = useCallback(async () => {
    setLoadError(false);
    try {
      setPlans(await listPlans(traineeId));
    } catch {
      setLoadError(true);
    }
  }, [traineeId]);

  /** Opens on the options; preselects a workout (the given one, else the first not done). */
  const open = useCallback(
    async (preferredWorkoutId?: string) => {
      if (!traineeId) return;
      setIsOpen(true);
      setStep('options');
      setExerciseId(null);
      setSwapOptions(undefined);
      setLoadError(false);
      let loaded: CoachPlan[] | undefined;
      try {
        loaded = await listPlans(traineeId);
        setPlans(loaded);
      } catch {
        setLoadError(true);
        return;
      }
      const week = loaded.filter((entry) => entry.weekStartDate === weekStart);
      const current = week.find((entry) => entry.status === 'published') ?? week[0];
      const sorted = current ? [...current.workouts].sort((a, b) => a.order - b.order) : [];
      const preferred = sorted.find((entry) => entry.id === preferredWorkoutId);
      const firstOpen = sorted.find((entry) => current?.progress?.statuses[entry.id] !== 'done');
      setWorkoutId((preferred ?? firstOpen ?? sorted[0])?.id ?? null);
    },
    [traineeId, weekStart],
  );

  const close = useCallback(() => {
    if (!isWorking) setIsOpen(false);
  }, [isWorking]);

  const back = useCallback(() => {
    setStep((current) => (current === 'swapReplace' ? 'swapPick' : 'options'));
  }, []);

  /** Saves a whole-plan payload; offers "undo" = the plan as it was. */
  const saveWithUndo = useCallback(
    async (payload: SavePlanPayload, doneText: string) => {
      if (!plan) return;
      const copy = coachCopy[getActiveLanguage()].edit;
      const before = planToSavePayload(plan);
      setIsWorking(true);
      try {
        await savePlan(traineeId, plan.id, payload);
        setIsOpen(false);
        onChanged();
        notify(doneText, {
          label: copy.undo,
          onSelect: () => {
            void savePlan(traineeId, plan.id, before)
              .then(() => {
                onChanged();
                notify(copy.undone);
              })
              .catch(() => notify(copy.error));
          },
        });
      } catch {
        notify(copy.error);
      } finally {
        setIsWorking(false);
      }
    },
    [plan, traineeId, notify, onChanged],
  );

  const startMove = useCallback(() => {
    setDay(workout?.dayOfWeek ?? null);
    setStep('move');
  }, [workout]);

  const saveMove = useCallback(async () => {
    if (!plan || !workout || day === null || day === workout.dayOfWeek) return;
    const copy = coachCopy[getActiveLanguage()].edit;
    await saveWithUndo(withWorkoutDay(plan, workout.id, day), fill(copy.moved, { name: traineeName }));
  }, [plan, workout, day, saveWithUndo, traineeName]);

  const startSwap = useCallback(() => {
    setExerciseId(null);
    setStep('swapPick');
  }, []);

  /** Her other variants of the same family first, then other families with the same movement (her equipment / level). */
  const pickExercise = useCallback(
    async (picked: PlanExercise) => {
      setExerciseId(picked.id);
      setStep('swapReplace');
      setSwapOptions(undefined);
      setSwapError(false);
      const facts = picked.exercise;
      try {
        const [family, byPattern] = await Promise.all([
          facts?.familyId ? getExerciseFamily(facts.familyId, traineeId) : Promise.resolve(null),
          facts?.patterns?.length
            ? searchExerciseFamilies({ patterns: facts.patterns.join(','), traineeId: traineeId, limit: SWAP_SEARCH_LIMIT })
            : Promise.resolve(null),
        ]);
        const toOption = (variant: { exerciseId: string; name: string; equipment: string[] }): SwapOption => ({
          exerciseId: variant.exerciseId,
          name: variant.name,
          equipment: variant.equipment,
        });
        const sameFamily = (family?.variants ?? []).filter((variant) => variant.allowed !== false && variant.exerciseId !== picked.exerciseId).map(toOption);
        const muscles = new Set(facts?.primaryMuscles ?? []);
        const otherFamilies = (byPattern?.items ?? [])
          .filter((entry) => entry.id !== facts?.familyId)
          // Families that share one of its muscles first ("לפי אותו שריר").
          .sort((a, b) => Number(b.muscles.some((muscle) => muscles.has(muscle))) - Number(a.muscles.some((muscle) => muscles.has(muscle))));
        const pattern = otherFamilies
          .flatMap((entry) => entry.variants.filter((variant) => variant.allowed !== false && variant.isPrimary).slice(0, 1))
          .filter((variant) => variant.exerciseId !== picked.exerciseId)
          .map(toOption);
        setSwapOptions({ family: sameFamily, pattern });
      } catch {
        setSwapError(true);
      }
    },
    [traineeId],
  );

  const swapTo = useCallback(
    async (replacementId: string) => {
      if (!plan || !workout || !exercise) return;
      const copy = coachCopy[getActiveLanguage()].edit;
      await saveWithUndo(withExerciseSwapped(plan, workout.id, exercise.id, replacementId), copy.swapped);
    },
    [plan, workout, exercise, saveWithUndo],
  );

  /** Next week = a copy of her most recent earlier plan (this week's), as a DRAFT — publishing stays a separate step. */
  const duplicateWeek = useCallback(async () => {
    const copy = coachCopy[getActiveLanguage()].edit;
    if (nextWeekTaken) {
      notify(copy.nextTaken);
      return;
    }
    setIsWorking(true);
    try {
      const draft = await createPlan(traineeId, { weekStartDate: nextWeekStart, duplicatePrevious: true });
      setIsOpen(false);
      onChanged();
      notify(copy.duplicated, {
        label: copy.undo,
        onSelect: () => {
          void deletePlan(traineeId, draft.id)
            .then(() => {
              onChanged();
              notify(copy.undone);
            })
            .catch(() => notify(copy.error));
        },
      });
    } catch {
      notify(copy.error);
    } finally {
      setIsWorking(false);
    }
  }, [nextWeekTaken, traineeId, nextWeekStart, notify, onChanged]);

  const openDashboard = useCallback(() => {
    if (dashboardUrl) window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  }, [dashboardUrl]);

  return {
    isOpen,
    open,
    close,
    back,
    step,
    plan,
    plans,
    loadError,
    reload: loadPlans,
    workouts,
    workout,
    selectWorkout: setWorkoutId,
    isDone,
    isDayOpen,
    exercise,
    day,
    setDay,
    startMove,
    saveMove,
    startSwap,
    pickExercise,
    swapOptions,
    swapError,
    swapTo,
    duplicateWeek,
    nextWeekTaken,
    dashboardUrl,
    openDashboard,
    isWorking,
  };
}
