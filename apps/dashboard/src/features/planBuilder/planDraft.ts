import { fill, getActiveLanguage, rematchSlots, withoutHiddenSlots } from '@sistem/shared';
import { planBuilderCopy } from './copy';
import type { CoachPlan, ExerciseFacts, PlanExerciseInput, SavePlanPayload, SetType, WorkoutTypeConfig } from '@sistem/types';
import type { DraftExercise, DraftKeys, DraftSetTarget, DraftTargets, DraftWorkout, PlanDraft } from './types';
import { DEFAULT_REPS, DEFAULT_SETS } from './data/planDefaults';
import { DEFAULT_CARDIO_SPORT, copySteps, presetSteps } from '../cardio/data/cardioPresets';

// Pure functions over the editable plan. No rule about what a valid plan is lives
// here — the server decides that and answers with issues.

export function newKey(): string {
  return crypto.randomUUID();
}

export function draftFromPlan(plan: CoachPlan): PlanDraft {
  return {
    notes: plan.notes ?? '',
    aiRecommendationId: plan.aiRecommendationId,
    splitId: plan.splitId,
    workouts: plan.workouts.map((workout) => ({
      key: newKey(),
      id: workout.id,
      title: workout.title,
      dayOfWeek: workout.dayOfWeek,
      notes: workout.notes ?? '',
      workoutType: workout.workoutType,
      hiddenSlotIds: workout.hiddenSlotIds,
      ...(workout.kind === 'cardio' && workout.cardio ? { kind: 'cardio' as const, cardio: workout.cardio } : {}),
      exercises: workout.exercises.map((exercise) => ({
        key: newKey(),
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        facts: exercise.exercise,
        mode: exercise.durationSec !== undefined && exercise.reps === undefined ? 'time' : 'reps',
        sets: exercise.sets,
        reps: exercise.reps,
        repsMax: exercise.repsMax,
        durationSec: exercise.durationSec,
        targetWeight: exercise.targetWeight,
        restSec: exercise.restSec,
        notes: exercise.notes ?? '',
        supersetGroup: exercise.supersetGroup ?? '',
        setTargets: exercise.setTargets?.map((target) => ({ key: newKey(), ...target })) ?? null,
        interval: exercise.interval ?? false,
        slotId: exercise.slotId,
      })),
    })),
  };
}

function exerciseToInput(exercise: DraftExercise): PlanExerciseInput {
  const common = {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    notes: exercise.notes.trim() || undefined,
    supersetGroup: exercise.supersetGroup || undefined,
    interval: exercise.interval || undefined,
    slotId: exercise.slotId,
  };

  if (exercise.setTargets) {
    return {
      ...common,
      setTargets: exercise.setTargets.map(({ type, reps, repsMax, durationSec, targetWeight, restSec }) => ({
        type,
        reps,
        repsMax,
        durationSec,
        targetWeight,
        restSec,
      })),
    };
  }

  return {
    ...common,
    sets: exercise.sets,
    // Simple mode counts reps or seconds, never both.
    reps: exercise.mode === 'reps' ? exercise.reps : undefined,
    repsMax: exercise.mode === 'reps' ? exercise.repsMax : undefined,
    durationSec: exercise.mode === 'time' ? exercise.durationSec : undefined,
    targetWeight: exercise.targetWeight,
    restSec: exercise.restSec,
  };
}

export function toPayload(draft: PlanDraft): SavePlanPayload {
  return {
    notes: draft.notes.trim() || undefined,
    aiRecommendationId: draft.aiRecommendationId ?? null,
    splitId: draft.splitId ?? null,
    workouts: draft.workouts.map((workout, index) => ({
      id: workout.id,
      // A name is required: a cleared field saves as the default name of its place ("Workout 2").
      title: workout.title.trim() || fill(planBuilderCopy[getActiveLanguage()].workoutPlaceholder, { n: index + 1 }),
      dayOfWeek: workout.dayOfWeek,
      notes: workout.notes.trim() || undefined,
      workoutType: workout.workoutType,
      ...(workout.workoutType && workout.hiddenSlotIds?.length ? { hiddenSlotIds: workout.hiddenSlotIds } : {}),
      ...(workout.kind === 'cardio' && workout.cardio ? { kind: 'cardio' as const, cardio: workout.cardio } : {}),
      exercises: workout.exercises.map(exerciseToInput),
    })),
  };
}

export function keysOf(draft: PlanDraft): DraftKeys {
  return draft.workouts.map((workout) => ({ key: workout.key, exercises: workout.exercises.map((exercise) => exercise.key) }));
}

/**
 * Gives new items the ids the server stored for them. `sentKeys` is the draft as it
 * was sent (the response has the same order), so this also works on a draft that was
 * edited while the save was on its way.
 */
export function assignSavedIds(draft: PlanDraft, sentKeys: DraftKeys, saved: CoachPlan): PlanDraft {
  const ids = new Map<string, string>();
  sentKeys.forEach((sentWorkout, workoutIndex) => {
    const savedWorkout = saved.workouts[workoutIndex];
    if (!savedWorkout) return;
    ids.set(sentWorkout.key, savedWorkout.id);
    sentWorkout.exercises.forEach((exerciseKey, exerciseIndex) => {
      const savedExercise = savedWorkout.exercises[exerciseIndex];
      if (savedExercise) ids.set(exerciseKey, savedExercise.id);
    });
  });

  return {
    ...draft,
    workouts: draft.workouts.map((workout) => ({
      ...workout,
      id: ids.get(workout.key) ?? workout.id,
      exercises: workout.exercises.map((exercise) => ({ ...exercise, id: ids.get(exercise.key) ?? exercise.id })),
    })),
  };
}

/** `title`: the type's label (or a placeholder she is expected to rename — a workout needs a title). */
export function newWorkout(title: string, workoutType?: string): DraftWorkout {
  return { key: newKey(), title, notes: '', workoutType, exercises: [] };
}

/** A cardio workout of the week: the default preset ("אינטרוולים 1:1"); its day and note are the workout's own. */
export function newCardioWorkout(title: string): DraftWorkout {
  return { key: newKey(), title, notes: '', kind: 'cardio', cardio: { sport: DEFAULT_CARDIO_SPORT, metric: 'rpe', steps: presetSteps(DEFAULT_CARDIO_SPORT) }, exercises: [] };
}

export function newExercise(facts: ExerciseFacts, slotId?: string): DraftExercise {
  return {
    slotId,
    key: newKey(),
    exerciseId: facts.id,
    facts,
    mode: 'reps',
    sets: DEFAULT_SETS,
    reps: DEFAULT_REPS,
    notes: '',
    supersetGroup: '',
    setTargets: null,
    interval: false,
  };
}

/** A copy that the server will store as new items (no ids). */
export function duplicateWorkout(workout: DraftWorkout): DraftWorkout {
  return {
    ...workout,
    key: newKey(),
    id: undefined,
    // Fresh block ids too, so the copy's blocks never share keys with the original's.
    cardio: workout.cardio ? { ...workout.cardio, steps: copySteps(workout.cardio.steps) } : undefined,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      key: newKey(),
      id: undefined,
      setTargets: exercise.setTargets?.map((target) => ({ ...target, key: newKey() })) ?? null,
    })),
  };
}

function targetsOf(source: DraftTargets): DraftTargets {
  const { reps, repsMax, durationSec, targetWeight, restSec } = source;
  return { reps, repsMax, durationSec, targetWeight, restSec };
}

export function newSetTarget(type: SetType, copyFrom?: DraftTargets): DraftSetTarget {
  return { key: newKey(), type, ...(copyFrom ? targetsOf(copyFrom) : {}) };
}

/** Simple → per-set: one working row per set, pre-filled with the simple values. */
export function toPerSetTargets(exercise: DraftExercise): DraftSetTarget[] {
  const simple: DraftTargets = {
    reps: exercise.mode === 'reps' ? exercise.reps : undefined,
    repsMax: exercise.mode === 'reps' ? exercise.repsMax : undefined,
    durationSec: exercise.mode === 'time' ? exercise.durationSec : undefined,
    targetWeight: exercise.targetWeight,
    restSec: exercise.restSec,
  };
  return Array.from({ length: Math.max(1, exercise.sets ?? 1) }, () => newSetTarget('working', simple));
}

/**
 * Per-set → simple: the per-set values are dropped; the first working set (or the
 * first set) becomes the value for every set.
 */
export function toSimpleTargets(exercise: DraftExercise): DraftExercise {
  const targets = exercise.setTargets ?? [];
  const base = targets.find((target) => target.type === 'working') ?? targets[0];
  if (!base) return { ...exercise, setTargets: null };
  return {
    ...exercise,
    ...targetsOf(base),
    mode: base.durationSec !== undefined && base.reps === undefined ? 'time' : 'reps',
    sets: targets.length,
    setTargets: null,
  };
}

/** Every set counts seconds, none counts reps — what Interval mode needs. */
export function isTimedExercise(exercise: DraftExercise): boolean {
  if (exercise.setTargets) {
    return exercise.setTargets.length > 0 && exercise.setTargets.every((t) => t.durationSec !== undefined && t.reps === undefined);
  }
  return exercise.mode === 'time';
}

/**
 * Turns Interval on / off for one exercise — and for the rest of its superset, since a
 * circuit runs as one interval timer (all or none).
 */
export function setIntervalFlag(exercises: DraftExercise[], key: string, interval: boolean): DraftExercise[] {
  const group = exercises.find((exercise) => exercise.key === key)?.supersetGroup ?? '';
  return exercises.map((exercise) =>
    exercise.key === key || (group !== '' && exercise.supersetGroup === group) ? { ...exercise, interval } : exercise,
  );
}

/**
 * Phase 12b: a typed workout lists its exercises by slot (the type's order), "Other" last —
 * a stable sort, so the order inside a slot stays hers.
 */
export function orderBySlots(exercises: DraftExercise[], type: WorkoutTypeConfig | undefined): DraftExercise[] {
  if (!type) return exercises;
  const rank = (exercise: DraftExercise) => {
    const index = type.slots.findIndex((slot) => slot.id === exercise.slotId);
    return index === -1 ? type.slots.length : index;
  };
  return exercises.map((exercise, index) => ({ exercise, index })).sort((a, b) => rank(a.exercise) - rank(b.exercise) || a.index - b.index).map(({ exercise }) => exercise);
}

/** Changes a workout's type: exercises keep / find a slot that fits them (rematchSlots), the rest go to "Other". */
export function changeWorkoutType(workout: DraftWorkout, type: WorkoutTypeConfig | undefined): DraftWorkout {
  const slots = rematchSlots(
    workout.exercises.map((exercise) => ({ slotId: exercise.slotId, patterns: exercise.facts?.patterns })),
    type,
  );
  const exercises = workout.exercises.map((exercise, index) => ({ ...exercise, slotId: slots[index] }));
  // A new type brings its own suggestions: none of them is removed yet.
  return { ...workout, workoutType: type?.id, hiddenSlotIds: undefined, exercises: orderBySlots(exercises, type) };
}

/** Adds an exercise to a workout: into `slotId`, else the first shown slot that fits it, else "Other". */
export function addExerciseToWorkout(workout: DraftWorkout, facts: ExerciseFacts, type: WorkoutTypeConfig | undefined, slotId?: string): DraftWorkout {
  let slot = slotId;
  if (!slot && type) {
    const all = [...workout.exercises.map((exercise) => ({ slotId: exercise.slotId, patterns: exercise.facts?.patterns })), { patterns: facts.patterns }];
    slot = rematchSlots(all, withoutHiddenSlots(type, workout.hiddenSlotIds))[all.length - 1];
  }
  return { ...workout, exercises: orderBySlots([...workout.exercises, newExercise(facts, slot)], type) };
}

/** Takes one exercise out of a workout (the row's "Remove exercise"). */
export function removeExercise(workout: DraftWorkout, exerciseKey: string): DraftWorkout {
  return { ...workout, exercises: workout.exercises.filter((exercise) => exercise.key !== exerciseKey) };
}

/**
 * After a workout left the week (or came back with "Undo"): a workout still called by its default
 * name for its old place ("Workout 3", in either language) takes the default name of its new place.
 * A name the coach wrote is never touched; a workout not in `before` keeps its name.
 */
export function renumberDefaultTitles(before: DraftWorkout[], after: DraftWorkout[], defaultTitles: ((n: number) => string)[]): DraftWorkout[] {
  const oldIndexes = new Map(before.map((workout, index) => [workout.key, index]));
  return after.map((workout, index) => {
    const from = oldIndexes.get(workout.key);
    if (from === undefined || from === index) return workout;
    const defaultTitle = defaultTitles.find((title) => workout.title.trim() === title(from + 1));
    return defaultTitle ? { ...workout, title: defaultTitle(index + 1) } : workout;
  });
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * A hint while editing (the server enforces this on publish): a superset label used
 * by one exercise only, by exercises that are not next to each other, or a circuit
 * where only some exercises are Interval.
 */
export function supersetWarnings(exercises: DraftExercise[], copy: (typeof planBuilderCopy)['he']): Map<string, string> {
  const positions = new Map<string, number[]>();
  exercises.forEach((exercise, index) => {
    if (!exercise.supersetGroup) return;
    positions.set(exercise.supersetGroup, [...(positions.get(exercise.supersetGroup) ?? []), index]);
  });

  const warnings = new Map<string, string>();
  for (const [group, indexes] of positions) {
    if (indexes.length < 2) {
      warnings.set(exercises[indexes[0]].key, fill(copy.supersetTooSmall, { group }));
      continue;
    }
    indexes.forEach((position, i) => {
      if (i > 0 && position !== indexes[i - 1] + 1) {
        warnings.set(exercises[position].key, fill(copy.supersetNotAdjacent, { group }));
      }
    });
    const mixed = indexes.find((position) => !exercises[position].interval);
    if (mixed !== undefined && indexes.some((position) => exercises[position].interval)) {
      warnings.set(exercises[mixed].key, fill(copy.supersetIntervalMixed, { group }));
    }
  }
  return warnings;
}
