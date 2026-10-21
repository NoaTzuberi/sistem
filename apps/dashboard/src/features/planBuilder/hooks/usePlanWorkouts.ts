import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fill } from '@sistem/shared';
import { planBuilderCopy } from '../copy';
import { WORKOUT_COLLAPSE_MS } from '../data/planDefaults';
import { workoutTabId } from '../data/workoutTabs';
import { duplicateWorkout, newCardioWorkout, newWorkout, renumberDefaultTitles } from '../planDraft';
import type { DraftWorkout } from '../types';

/** The plan builder keeps its selected workout in the URL (?workout=<id>), so a reload or a link reopens it. */
const WORKOUT_PARAM = 'workout';

// A workout named by default in either language ("אימון 3" / "Workout 3") is renumbered when others leave.
const DEFAULT_TITLES = [planBuilderCopy.he, planBuilderCopy.en].map((copy) => (n: number) => fill(copy.workoutPlaceholder, { n }));

/** After a delete or an undo, the focus goes to this workout's tab — or, with the week empty, to the start card. */
const FOCUS_EMPTY = Symbol('empty week');

interface PlanWorkoutsOptions {
  workouts: DraftWorkout[];
  setWorkouts: (update: (current: DraftWorkout[]) => DraftWorkout[]) => void;
  /** "אימון N": the title a new workout starts with. */
  placeholderTitle: (n: number) => string;
  onDuplicated?: (source: DraftWorkout) => void;
  /** A workout was deleted; `restore` puts it back where it was ("Undo"). */
  onRemoved?: (workout: DraftWorkout, restore: () => void) => void;
}

/**
 * The week's workouts as the builder edits them: which one is open (in the URL), and adding a
 * strength or a cardio workout, duplicating and removing — every kind the same way, in this week.
 * A newly added workout is selected and scrolled into view. A deleted one folds away, then the next
 * workout is opened and focused; it can come back with "Undo" (all its content, in its old place).
 */
export function usePlanWorkouts({ workouts, setWorkouts, placeholderTitle, onDuplicated, onRemoved }: PlanWorkoutsOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get(WORKOUT_PARAM);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    () => workouts.find((workout) => workout.id === param || workout.key === param)?.key ?? workouts[0]?.key,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  // The empty week's first start card: the focus lands there when the last workout is deleted.
  const emptyFocusRef = useRef<HTMLButtonElement>(null);
  const scrollPending = useRef(false);
  const focusPending = useRef<string | typeof FOCUS_EMPTY | null>(null);
  // The workout folding away right now (a second press during the fold does nothing).
  const [leavingKey, setLeavingKey] = useState<string>();
  const collapse = useRef<Animation | null>(null);

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

  // Runs before paint, once the deleted (or restored) workout's change is on screen: the fold's
  // held last frame is dropped and the focus moves.
  useLayoutEffect(() => {
    if (collapse.current && leavingKey && !workouts.some((workout) => workout.key === leavingKey)) {
      collapse.current.cancel();
      collapse.current = null;
      setLeavingKey(undefined);
    }
    const target = focusPending.current;
    if (target === null) return;
    focusPending.current = null;
    if (target === FOCUS_EMPTY) emptyFocusRef.current?.focus();
    else document.getElementById(workoutTabId(target))?.focus();
  }, [workouts, leavingKey]);

  /** Takes the workout out of the week (renumbering default names), opens the next one, offers "Undo". */
  function removeNow(key: string) {
    // setWorkouts runs its update at once: what it found is read right after.
    const found: { workout?: DraftWorkout; index: number; next?: DraftWorkout } = { index: -1 };
    setWorkouts((current) => {
      const index = current.findIndex((workout) => workout.key === key);
      if (index === -1) return current;
      const after = renumberDefaultTitles(current, current.filter((workout) => workout.key !== key), DEFAULT_TITLES);
      Object.assign(found, { workout: current[index], index, next: after[index] ?? after[index - 1] });
      return after;
    });
    const { workout, index, next } = found;
    if (!collapse.current || !workout) {
      collapse.current?.cancel();
      collapse.current = null;
      setLeavingKey(undefined);
    }
    if (!workout) return;
    select(next);
    focusPending.current = next?.key ?? FOCUS_EMPTY;
    onRemoved?.(workout, () => {
      const restored = { done: false };
      setWorkouts((current) => {
        if (current.some((other) => other.key === workout.key)) return current;
        restored.done = true;
        const place = Math.min(index, current.length);
        return renumberDefaultTitles(current, [...current.slice(0, place), workout, ...current.slice(place)], DEFAULT_TITLES);
      });
      if (!restored.done) return;
      select(workout);
      focusPending.current = workout.key;
    });
  }

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
    /** The card's "×" and its menu's "Delete workout": no confirm — the toast offers "Undo". */
    remove(workout: DraftWorkout) {
      if (leavingKey) return;
      setLeavingKey(workout.key);
      const panel = panelRef.current;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!panel || reduce || typeof panel.animate !== 'function') {
        removeNow(workout.key);
        return;
      }
      // Height + opacity; the last frame is held until the workout is gone (the layout effect drops it).
      const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'ease-out';
      const animation = panel.animate([{ height: `${panel.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], {
        duration: WORKOUT_COLLAPSE_MS,
        easing,
        fill: 'forwards',
      });
      collapse.current = animation;
      animation.onfinish = () => removeNow(workout.key);
    },
    /** The workout folding away (its panel clips while it does). */
    leavingKey,
    emptyFocusRef,
  };
}
