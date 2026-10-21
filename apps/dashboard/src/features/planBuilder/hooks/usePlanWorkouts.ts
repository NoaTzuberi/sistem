import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { duplicateWorkout, newCardioWorkout, newWorkout } from '../planDraft';
import type { DraftWorkout } from '../types';

/** The plan builder keeps its selected workout in the URL (?workout=<id>), so a reload or a link reopens it. */
const WORKOUT_PARAM = 'workout';

interface PlanWorkoutsOptions {
  workouts: DraftWorkout[];
  setWorkouts: (update: (current: DraftWorkout[]) => DraftWorkout[]) => void;
  /** "אימון N": the title a new workout starts with. */
  placeholderTitle: (n: number) => string;
  onDuplicated?: (source: DraftWorkout) => void;
  onRemoved?: (workout: DraftWorkout) => void;
}

/**
 * The week's workouts as the builder edits them: which one is open (in the URL), and adding a
 * strength or a cardio workout, duplicating and removing — every kind the same way, in this week.
 * A newly added workout is selected and scrolled into view.
 */
export function usePlanWorkouts({ workouts, setWorkouts, placeholderTitle, onDuplicated, onRemoved }: PlanWorkoutsOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get(WORKOUT_PARAM);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    () => workouts.find((workout) => workout.id === param || workout.key === param)?.key ?? workouts[0]?.key,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollPending = useRef(false);

  const selected = workouts.find((workout) => workout.key === selectedKey) ?? workouts[0];
  const selectedIndex = selected ? workouts.indexOf(selected) : -1;

  function writeParam(value: string | undefined) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(WORKOUT_PARAM, value);
        else next.delete(WORKOUT_PARAM);
        return next;
      },
      { replace: true },
    );
  }

  function select(workout: Pick<DraftWorkout, 'key' | 'id'> | undefined, { scroll = false } = {}) {
    setSelectedKey(workout?.key);
    writeParam(workout ? (workout.id ?? workout.key) : undefined);
    scrollPending.current = scroll;
  }

  // A new workout gets its id on the first save: the URL then names it by id.
  const selectedId = selected?.id;
  useEffect(() => {
    if (selectedId && param !== selectedId) writeParam(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selected workout's id appears
  }, [selectedId]);

  useEffect(() => {
    if (!scrollPending.current || !panelRef.current) return;
    scrollPending.current = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRef.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [selectedKey]);

  function add(workout: DraftWorkout) {
    setWorkouts((current) => [...current, workout]);
    select(workout, { scroll: true });
  }

  return {
    selected,
    selectedIndex,
    panelRef,
    select,
    /** A new free strength workout, without a day yet. */
    addStrength: () => add(newWorkout(placeholderTitle(workouts.length + 1))),
    /** A new cardio workout of this week (the default preset), without a day yet. */
    addCardio: () => add(newCardioWorkout(placeholderTitle(workouts.length + 1))),
    duplicate(index: number) {
      const source = workouts[index];
      if (!source) return;
      const copy = duplicateWorkout(source);
      setWorkouts((current) => [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]);
      select(copy);
      onDuplicated?.(source);
    },
    remove(workout: DraftWorkout) {
      setWorkouts((current) => current.filter((other) => other.key !== workout.key));
      onRemoved?.(workout);
    },
  };
}
