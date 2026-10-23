import { useCallback, useMemo, useState } from 'react';
import type { NutritionViewMeal, PortionCounts, PortionGroup } from '@sistem/types';
import { loadNutritionCache, saveNutritionCache } from '../data/nutritionCache';
import { addPortions, completedGroups, onePortion, portionsToAdd, removePortions, sumPortions, weekOf } from '../data/nutritionDay';
import { useMealTracker } from './useMealTracker';

/**
 * The selected day of the trainee Nutrition screen: the week strip, the day's log, and every way she
 * marks portions (a fuel cell, "I ate this" on a food, a menu meal). Each change returns the groups it
 * completed (the screen pops their badge and shows a toast).
 */
export function useNutritionDay(userId: string) {
  const tracker = useMealTracker(userId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mealMarks, setMealMarks] = useState(() => loadNutritionCache(userId).mealMarks);

  const today = tracker.today;
  const date = selectedDate ?? today;
  const day = tracker.days.find((candidate) => candidate.date === date) ?? null;
  const week = today ? weekOf(today, tracker.days) : [];
  const dayMarks = useMemo(() => (date && mealMarks[date]) || {}, [date, mealMarks]);

  const apply = useCallback(
    (next: PortionCounts): PortionGroup[] => {
      if (!day) return [];
      tracker.setEaten(day.date, next);
      return completedGroups(day.eaten, next, day.planned);
    },
    [day, tracker],
  );

  const saveMarks = useCallback(
    (forDate: string, marks: Record<string, PortionCounts>) => {
      // Only the days the server still sends are kept (the 7-day window).
      const kept = Object.fromEntries(
        Object.entries({ ...loadNutritionCache(userId).mealMarks, [forDate]: marks }).filter(([key]) =>
          tracker.days.some((candidate) => candidate.date === key),
        ),
      );
      saveNutritionCache(userId, { mealMarks: kept });
      setMealMarks(kept);
    },
    [tracker.days, userId],
  );

  /** A fuel cell: the group's new count. */
  const setGroup = useCallback(
    (group: PortionGroup, value: number) => (day ? apply({ ...day.eaten, [group]: value }) : []),
    [apply, day],
  );

  /** "I ate this" on a food: one more portion of its group (capped at planned); false when full. */
  const addPortion = useCallback(
    (group: PortionGroup): { added: boolean; completed: PortionGroup[] } => {
      if (!day?.editable) return { added: false, completed: [] };
      const added = portionsToAdd(onePortion(group), day.eaten, day.planned);
      if (sumPortions(added) === 0) return { added: false, completed: [] };
      return { added: true, completed: apply(addPortions(day.eaten, added)) };
    },
    [apply, day],
  );

  /** A menu meal's "I ate this": adds its portions; tapping again takes back exactly what it added. */
  const toggleMeal = useCallback(
    (meal: NutritionViewMeal): { marked: boolean; count: number; completed: PortionGroup[] } => {
      if (!day?.editable) return { marked: false, count: 0, completed: [] };
      const current = dayMarks[meal.id];
      if (current) {
        const { [meal.id]: _removed, ...rest } = dayMarks;
        saveMarks(day.date, rest);
        apply(removePortions(day.eaten, current));
        return { marked: false, count: sumPortions(current), completed: [] };
      }
      const added = portionsToAdd(meal.portions, day.eaten, day.planned);
      saveMarks(day.date, { ...dayMarks, [meal.id]: added });
      return { marked: true, count: sumPortions(added), completed: apply(addPortions(day.eaten, added)) };
    },
    [apply, day, dayMarks, saveMarks],
  );

  return {
    today,
    date,
    day,
    week,
    dayMarks,
    selectDate: setSelectedDate,
    setGroup,
    addPortion,
    toggleMeal,
    sync: tracker.sync,
    offline: tracker.loadFailed,
    replaceDay: tracker.replaceDay,
    reload: tracker.reload,
    ownTarget: tracker.ownTarget,
  };
}
