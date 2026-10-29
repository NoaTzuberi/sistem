import type { PatternId, TrainingSlot, WorkoutTypeConfig } from '@sistem/types';

// Pure slot logic for the plan builder (Phase 12b). The server checks the ids on save; these
// helpers only arrange what the coach sees and keep exercises in sensible slots when she changes
// a workout's type. They never decide whether a plan is valid. Slots are suggestions (owner,
// 2026-10-28): none is required and a slot takes any number of exercises.

export interface SlotExercise {
  slotId?: string;
  /** The exercise family's movement patterns (from the exercise facts). */
  patterns?: readonly PatternId[];
}

export function slotFits(slot: TrainingSlot, patterns: readonly PatternId[] | undefined): boolean {
  return Boolean(patterns?.some((pattern) => slot.patterns.includes(pattern)));
}

/**
 * New slot ids for the exercises of a workout whose type changes. An exercise keeps a slot with
 * the same id that still fits it; the rest go to the first slot that fits and still has room under
 * its guide (maxExercises), else the first slot that fits; what fits none goes to "Other"
 * (undefined). No type = all Other.
 */
export function rematchSlots(exercises: readonly SlotExercise[], type: WorkoutTypeConfig | undefined): (string | undefined)[] {
  if (!type) return exercises.map(() => undefined);
  const used = new Map<string, number>();
  const room = (slot: TrainingSlot) => (used.get(slot.id) ?? 0) < slot.maxExercises;
  const take = (slot: TrainingSlot) => {
    used.set(slot.id, (used.get(slot.id) ?? 0) + 1);
    return slot.id;
  };
  const result: (string | undefined)[] = exercises.map(() => undefined);

  exercises.forEach((exercise, index) => {
    const same = type.slots.find((slot) => slot.id === exercise.slotId);
    if (same && slotFits(same, exercise.patterns)) result[index] = take(same);
  });
  exercises.forEach((exercise, index) => {
    if (result[index]) return;
    const fitting = type.slots.filter((candidate) => slotFits(candidate, exercise.patterns));
    const slot = fitting.find(room) ?? fitting[0];
    if (slot) result[index] = take(slot);
  });
  return result;
}

export interface SlotSection {
  slot: TrainingSlot;
  /** Indexes of the workout's exercises in this slot, in workout order. */
  exerciseIndexes: number[];
}

/** The workout's exercises by slot (the type's slot order) + the ones in no slot of it ("Other"). */
export function groupBySlot(exercises: readonly SlotExercise[], type: WorkoutTypeConfig): { sections: SlotSection[]; other: number[] } {
  const sections = type.slots.map((slot) => ({ slot, exerciseIndexes: [] as number[] }));
  const other: number[] = [];
  exercises.forEach((exercise, index) => {
    const section = sections.find((entry) => entry.slot.id === exercise.slotId);
    if (section) section.exerciseIndexes.push(index);
    else other.push(index);
  });
  return { sections, other };
}

/** The type without the suggested slots the coach removed from this workout (undefined stays undefined). */
export function withoutHiddenSlots(type: WorkoutTypeConfig | undefined, hiddenSlotIds: readonly string[] | undefined): WorkoutTypeConfig | undefined {
  if (!type || !hiddenSlotIds?.length) return type;
  return { ...type, slots: type.slots.filter((slot) => !hiddenSlotIds.includes(slot.id)) };
}
