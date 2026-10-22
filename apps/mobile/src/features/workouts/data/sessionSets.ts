import type { PlanExercise, ResolvedPlanSet, SetType, WorkoutLogSetUpdate, WorkoutSession } from '@sistem/types';
import { WEIGHT_STEP_KG } from './sessionConfig';

// The session screen's model of a workout, built from the server's log (pre-filled
// sets) and the planned workout (targets, notes, supersets). The sets themselves are
// never derived here: every set comes from the log, matched to its planned target by
// planExerciseId + setIndex.

/** What the trainee can change on one set. */
export interface SetValues {
  reps?: number;
  /** kg */
  weight?: number;
  durationSec?: number;
  completed: boolean;
}

export type SetValuesByKey = Record<string, SetValues>;

export interface SessionSet {
  key: string;
  planExerciseId: string;
  setIndex: number;
  type: SetType;
  /** The planned set; missing only if the coach removed it after the workout started. */
  target?: ResolvedPlanSet;
  /** A hold, not reps (plank 45s). */
  timed: boolean;
}

export interface SessionExercise {
  plan: PlanExercise;
  sets: SessionSet[];
  weightStep: number;
}

/** One exercise, or the exercises of one superset, done back to back. */
export interface SessionBlock {
  id: string;
  supersetGroup?: string;
  exercises: SessionExercise[];
}

export interface SessionModel {
  blocks: SessionBlock[];
  /** Every set in the order she does them: supersets alternate A1, A2, A1, A2… */
  flow: SessionSet[];
  setByKey: Map<string, SessionSet>;
  blockIdByKey: Map<string, string>;
}

/** Runs as one interval timer: every exercise of the block is Interval (a circuit is all or none). */
export function isIntervalBlock(block: SessionBlock): boolean {
  return block.exercises.every((exercise) => exercise.plan.interval === true);
}

export function setKey(planExerciseId: string, setIndex: number): string {
  return `${planExerciseId}:${setIndex}`;
}

function isTimed(target: ResolvedPlanSet | undefined, logged: { durationSec?: number; reps?: number }): boolean {
  if (target) return target.durationSec !== undefined && target.reps === undefined;
  return logged.durationSec !== undefined && logged.reps === undefined;
}

/** Superset rounds: round 1 of every exercise, then round 2, … (uneven counts are skipped). */
function blockFlow(block: SessionBlock): SessionSet[] {
  if (block.exercises.length === 1) return block.exercises[0].sets;
  const rounds = Math.max(...block.exercises.map((exercise) => exercise.sets.length));
  const flow: SessionSet[] = [];
  for (let round = 0; round < rounds; round += 1) {
    for (const exercise of block.exercises) {
      if (exercise.sets[round]) flow.push(exercise.sets[round]);
    }
  }
  return flow;
}

export function buildSessionModel(session: WorkoutSession): SessionModel {
  const blocks: SessionBlock[] = [];
  const blockByGroup = new Map<string, SessionBlock>();

  for (const plan of session.workout.exercises) {
    const sets = session.log.sets
      .filter((set) => set.planExerciseId === plan.id)
      .sort((a, b) => a.setIndex - b.setIndex)
      .map((set): SessionSet => {
        const target = plan.resolvedSets.find((resolved) => resolved.setIndex === set.setIndex);
        return {
          key: setKey(plan.id, set.setIndex),
          planExerciseId: plan.id,
          setIndex: set.setIndex,
          type: set.type ?? target?.type ?? 'working',
          target,
          timed: isTimed(target, set),
        };
      });
    // Added to the plan after the workout started: not part of this session.
    if (sets.length === 0) continue;

    const exercise: SessionExercise = { plan, sets, weightStep: WEIGHT_STEP_KG };
    const group = plan.supersetGroup;
    const existing = group ? blockByGroup.get(group) : undefined;
    if (existing) {
      existing.exercises.push(exercise);
    } else {
      const block: SessionBlock = { id: group ? `superset-${group}` : plan.id, supersetGroup: group, exercises: [exercise] };
      blocks.push(block);
      if (group) blockByGroup.set(group, block);
    }
  }

  // A "superset" of one exercise (the rest left the plan) is just an exercise.
  for (const block of blocks) {
    if (block.exercises.length === 1) block.supersetGroup = undefined;
  }

  const flow = blocks.flatMap(blockFlow);
  const blockIdByKey = new Map<string, string>();
  for (const block of blocks) {
    for (const exercise of block.exercises) {
      for (const set of exercise.sets) blockIdByKey.set(set.key, block.id);
    }
  }
  return { blocks, flow, setByKey: new Map(flow.map((set) => [set.key, set])), blockIdByKey };
}

export function initialValues(session: WorkoutSession): SetValuesByKey {
  const values: SetValuesByKey = {};
  for (const set of session.log.sets) {
    if (!set.planExerciseId) continue;
    values[setKey(set.planExerciseId, set.setIndex)] = {
      reps: set.reps,
      weight: set.weight,
      durationSec: set.durationSec,
      completed: set.completed,
    };
  }
  return values;
}

/** The full state of one set, as the server expects it (null clears a value). */
export function toSetUpdate(set: SessionSet, values: SetValues): WorkoutLogSetUpdate {
  return {
    planExerciseId: set.planExerciseId,
    setIndex: set.setIndex,
    reps: values.reps ?? null,
    weight: values.weight ?? null,
    durationSec: values.durationSec ?? null,
    completed: values.completed,
  };
}

/**
 * Extra sets she added on the phone that the server doesn't have yet (still unsent): put back
 * into the server's log, so a reload keeps showing them until the update goes through.
 */
export function withPendingExtraSets(session: WorkoutSession, updates: WorkoutLogSetUpdate[]): WorkoutSession {
  const missing = updates
    .filter((update) => !session.log.sets.some((set) => set.planExerciseId === update.planExerciseId && set.setIndex === update.setIndex))
    .sort((a, b) => a.setIndex - b.setIndex);
  if (missing.length === 0) return session;
  const sets = [...session.log.sets];
  for (const update of missing) {
    const sibling = sets.find((set) => set.planExerciseId === update.planExerciseId);
    if (!sibling) continue;
    sets.push({
      exerciseId: sibling.exerciseId,
      planExerciseId: update.planExerciseId,
      setIndex: update.setIndex,
      type: 'working',
      reps: update.reps ?? undefined,
      weight: update.weight ?? undefined,
      durationSec: update.durationSec ?? undefined,
      completed: update.completed,
    });
  }
  return { ...session, log: { ...session.log, sets } };
}

/** Local changes not yet confirmed by the server win over what the server sent. */
export function applyUpdates(values: SetValuesByKey, updates: WorkoutLogSetUpdate[]): SetValuesByKey {
  const next = { ...values };
  for (const update of updates) {
    next[setKey(update.planExerciseId, update.setIndex)] = {
      reps: update.reps ?? undefined,
      weight: update.weight ?? undefined,
      durationSec: update.durationSec ?? undefined,
      completed: update.completed,
    };
  }
  return next;
}

export function nextOpenSet(model: SessionModel, values: SetValuesByKey): SessionSet | null {
  return model.flow.find((set) => !values[set.key]?.completed) ?? null;
}

/**
 * The open set to do after `key`: the next one in workout order, wrapping around — so
 * focus follows her, even when she does the exercises out of order.
 */
export function nextOpenSetAfter(model: SessionModel, values: SetValuesByKey, key: string): SessionSet | null {
  const start = model.flow.findIndex((set) => set.key === key);
  for (let offset = 1; offset <= model.flow.length; offset += 1) {
    const set = model.flow[(start + offset) % model.flow.length];
    if (set.key !== key && !values[set.key]?.completed) return set;
  }
  return null;
}

export function countDone(model: SessionModel, values: SetValuesByKey): number {
  return model.flow.filter((set) => values[set.key]?.completed).length;
}

/**
 * Rest after this set was marked done: its planned rest, except between the exercises
 * of a superset round (only after the last one of the round) and after the very last
 * open set of the workout. null = no rest.
 */
export function restAfter(model: SessionModel, values: SetValuesByKey, key: string): number | null {
  const set = model.setByKey.get(key);
  if (!set || !nextOpenSet(model, values)) return null;

  const block = model.blocks.find((candidate) => candidate.id === model.blockIdByKey.get(key));
  if (block && block.exercises.length > 1) {
    const inRound = block.exercises.filter((exercise) => exercise.sets.some((s) => s.setIndex === set.setIndex));
    const last = inRound[inRound.length - 1];
    if (last.plan.id !== set.planExerciseId) return null;
  }
  // An extra set (no planned target) rests like the exercise's last planned set.
  const restSec = set.target?.restSec ?? exerciseOf(model, set.planExerciseId)?.plan.resolvedSets.at(-1)?.restSec;
  return restSec && restSec > 0 ? restSec : null;
}

export function exerciseOf(model: SessionModel, planExerciseId: string): SessionExercise | undefined {
  for (const block of model.blocks) {
    const found = block.exercises.find((exercise) => exercise.plan.id === planExerciseId);
    if (found) return found;
  }
  return undefined;
}

/** What the coach prescribed, for the scoreboard: set count, reps (or seconds) range, rest range. */
export interface Prescription {
  sets: number;
  /** min–max reps, or seconds when every set is a hold. */
  amount: { min: number; max: number } | null;
  timed: boolean;
  rest: { min: number; max: number } | null;
}

function range(values: number[]): { min: number; max: number } | null {
  return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : null;
}

export function prescriptionOf(exercise: SessionExercise): Prescription {
  const targets = exercise.plan.resolvedSets;
  const timed = exercise.sets.every((set) => set.timed);
  const amounts = timed
    ? targets.flatMap((target) => (target.durationSec !== undefined ? [target.durationSec] : []))
    : targets.flatMap((target) => (target.reps !== undefined ? [target.reps, target.repsMax ?? target.reps] : []));
  const rests = targets.flatMap((target) => (target.restSec ? [target.restSec] : []));
  return { sets: exercise.sets.length, amount: range(amounts), timed, rest: range(rests) };
}

/** The first open set of a block, in its flow order (supersets alternate). */
export function firstOpenSetIn(model: SessionModel, values: SetValuesByKey, blockId: string): SessionSet | null {
  return model.flow.find((set) => model.blockIdByKey.get(set.key) === blockId && !values[set.key]?.completed) ?? null;
}

/** Same planned set (a pyramid's steps differ, so they never copy each other). */
function sameTarget(a: ResolvedPlanSet | undefined, b: ResolvedPlanSet | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.type === b.type &&
    a.reps === b.reps &&
    a.repsMax === b.repsMax &&
    a.durationSec === b.durationSec &&
    a.targetWeight === b.targetWeight
  );
}

/**
 * Carry forward: when she marks a set done, the later open sets of the same exercise
 * with the same planned target that she hasn't edited take its values — so a changed
 * weight is entered once, not on every set. Returns only the sets that change.
 */
export function carryForward(
  model: SessionModel,
  values: SetValuesByKey,
  key: string,
  touched: ReadonlySet<string>,
): SetValuesByKey {
  const source = model.setByKey.get(key);
  const sourceValues = values[key];
  if (!source || !sourceValues) return {};

  const exercise = model.blocks
    .flatMap((block) => block.exercises)
    .find((candidate) => candidate.plan.id === source.planExerciseId);
  const changes: SetValuesByKey = {};
  for (const set of exercise?.sets ?? []) {
    const current = values[set.key];
    if (
      set.setIndex <= source.setIndex ||
      !sameTarget(set.target, source.target) ||
      !current ||
      current.completed ||
      touched.has(set.key)
    ) {
      continue;
    }
    const next: SetValues = {
      ...current,
      ...(sourceValues.reps !== undefined && { reps: sourceValues.reps }),
      ...(sourceValues.weight !== undefined && { weight: sourceValues.weight }),
      ...(sourceValues.durationSec !== undefined && { durationSec: sourceValues.durationSec }),
    };
    if (next.reps !== current.reps || next.weight !== current.weight || next.durationSec !== current.durationSec) {
      changes[set.key] = next;
    }
  }
  return changes;
}
