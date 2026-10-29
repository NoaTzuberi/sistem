import mongoose from 'mongoose';
import type { SetType, TrainingConfig } from '@sistem/types';
import { msg, type ServerMessage } from '../../i18n';
import {
  SET_TYPE_IDS,
  MIN_DAY_OF_WEEK,
  MAX_DAY_OF_WEEK,
  SUPERSET_GROUP_PATTERN,
  MAX_PLAN_WORKOUTS,
  MAX_WORKOUT_EXERCISES,
  MAX_EXERCISE_SETS,
  MAX_PLAN_TEXT_LENGTH,
  MAX_WORKOUT_TITLE_LENGTH,
} from './plan.constants';
import { isSunday } from './planWeek';
import { parsePlanCardio } from '../cardio/cardio.validation';
import type { PlanCardioFields } from './plan.types';
import { validatePlanExerciseTargets } from './planSets';

/** Ids of the coach's training config (workout types, slots, splits — Phase 12b). */
const TRAINING_ID_PATTERN = /^[a-z0-9_]{1,40}$/;
/** Suggested slots one workout can hide (a type has at most 12). */
const MAX_HIDDEN_SLOTS = 12;

export function validatePlanIdParam(id: unknown): ServerMessage | null {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
    return msg('plan_invalid_id');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plan builder payloads (coach). Every problem is reported with the workout /
// exercise it belongs to, so the builder can show it next to the right row.
// ---------------------------------------------------------------------------

export interface SetTargetInput {
  type: SetType;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
}

export interface PlanExerciseInputFields {
  id?: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
  notes?: string;
  supersetGroup?: string;
  setTargets?: SetTargetInput[];
  interval?: boolean;
  slotId?: string;
}

export interface PlanWorkoutInputFields {
  id?: string;
  title: string;
  dayOfWeek?: number;
  notes?: string;
  workoutType?: string;
  /** Set only for cardio (missing = strength). */
  kind?: 'cardio';
  cardio?: PlanCardioFields;
  exercises: PlanExerciseInputFields[];
}

export interface SavePlanInput {
  notes?: string;
  workouts: PlanWorkoutInputFields[];
  /** undefined = keep the current link; null = clear it. */
  aiRecommendationId?: string | null;
  /** undefined = keep; null = clear (Phase 12b). */
  splitId?: string | null;
}

/** One problem with the row it belongs to; worded per response (localizeIssues). */
export type PlanProblem = ServerMessage & { workoutIndex?: number; exerciseIndex?: number };

type ParseResult<T> = { value: T; issues: [] } | { value: null; issues: PlanProblem[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

/** An optional id: kept only when it could be a real one (unknown ids get a new id). */
function optionalId(value: unknown): string | undefined {
  return typeof value === 'string' && mongoose.isValidObjectId(value) ? value : undefined;
}

interface NumberRule {
  min: number;
  integer: boolean;
}

const COUNT: NumberRule = { min: 1, integer: true };
const SECONDS_FROM_ZERO: NumberRule = { min: 0, integer: true };
const WEIGHT: NumberRule = { min: 0, integer: false };

/** Reads an optional number; pushes a problem and returns undefined when it is invalid. */
function readNumber(
  source: Record<string, unknown>,
  field: string,
  label: ServerMessage,
  rule: NumberRule,
  problems: ServerMessage[],
): number | undefined {
  const value = source[field];
  if (isMissing(value)) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || (rule.integer && !Number.isInteger(value))) {
    problems.push(msg(rule.integer ? 'plan_whole_number_min' : 'plan_number_min', { field: label, min: rule.min }));
    return undefined;
  }
  return value;
}

function readText(source: Record<string, unknown>, field: string, label: ServerMessage, problems: ServerMessage[]): string | undefined {
  const value = source[field];
  if (isMissing(value)) return undefined;
  if (typeof value !== 'string') {
    problems.push(msg('plan_text_not_text', { field: label }));
    return undefined;
  }
  if (value.length > MAX_PLAN_TEXT_LENGTH) {
    problems.push(msg('plan_text_too_long', { field: label, max: MAX_PLAN_TEXT_LENGTH }));
    return undefined;
  }
  return value.trim() || undefined;
}

/** A field label, or 'Set 2: <label>' for a per-set target. */
function fieldLabel(code: Parameters<typeof msg>[0], setNumber: number | null): ServerMessage {
  return setNumber === null ? msg(code) : msg('plan_field_of_set', { n: setNumber, field: msg(code) });
}

function readTargets(source: Record<string, unknown>, setNumber: number | null, problems: ServerMessage[]) {
  return {
    reps: readNumber(source, 'reps', fieldLabel('plan_field_reps', setNumber), COUNT, problems),
    repsMax: readNumber(source, 'repsMax', fieldLabel('plan_field_max_reps', setNumber), COUNT, problems),
    durationSec: readNumber(source, 'durationSec', fieldLabel('plan_field_duration', setNumber), COUNT, problems),
    targetWeight: readNumber(source, 'targetWeight', fieldLabel('plan_field_weight', setNumber), WEIGHT, problems),
    restSec: readNumber(source, 'restSec', fieldLabel('plan_field_rest', setNumber), SECONDS_FROM_ZERO, problems),
  };
}

function parseSetTargets(value: unknown, problems: ServerMessage[]): SetTargetInput[] | undefined {
  if (isMissing(value)) return undefined;
  if (!Array.isArray(value)) {
    problems.push(msg('plan_set_targets_not_list'));
    return undefined;
  }
  if (value.length > MAX_EXERCISE_SETS) {
    problems.push(msg('plan_too_many_sets', { max: MAX_EXERCISE_SETS }));
    return undefined;
  }

  const targets: SetTargetInput[] = [];
  value.forEach((raw, index) => {
    if (!isRecord(raw)) {
      problems.push(msg('plan_set_invalid', { n: index + 1 }));
      return;
    }
    if (typeof raw.type !== 'string' || !(SET_TYPE_IDS as readonly string[]).includes(raw.type)) {
      problems.push(msg('plan_set_unknown_type', { n: index + 1 }));
      return;
    }
    targets.push({ type: raw.type as SetType, ...readTargets(raw, index + 1, problems) });
  });
  return targets.length > 0 ? targets : undefined;
}

function parseExercise(raw: unknown, problems: ServerMessage[]): PlanExerciseInputFields | null {
  if (!isRecord(raw)) {
    problems.push(msg('plan_exercise_invalid'));
    return null;
  }
  if (typeof raw.exerciseId !== 'string' || !mongoose.isValidObjectId(raw.exerciseId)) {
    problems.push(msg('plan_exercise_unknown'));
    return null;
  }

  const before = problems.length;
  const setTargets = parseSetTargets(raw.setTargets, problems);
  const sets = setTargets ? setTargets.length : readNumber(raw, 'sets', msg('plan_field_sets'), COUNT, problems);
  const targets = readTargets(raw, null, problems);
  const notes = readText(raw, 'notes', msg('plan_field_notes'), problems);

  let supersetGroup: string | undefined;
  if (!isMissing(raw.supersetGroup) && raw.supersetGroup !== '') {
    const label = typeof raw.supersetGroup === 'string' ? raw.supersetGroup.trim().toUpperCase() : '';
    if (SUPERSET_GROUP_PATTERN.test(label)) supersetGroup = label;
    else problems.push(msg('plan_superset_label_invalid'));
  }

  let interval: boolean | undefined;
  if (!isMissing(raw.interval)) {
    if (typeof raw.interval === 'boolean') interval = raw.interval || undefined;
    else problems.push(msg('plan_interval_not_boolean'));
  }

  if (sets !== undefined && sets > MAX_EXERCISE_SETS) {
    problems.push(msg('plan_too_many_sets', { max: MAX_EXERCISE_SETS }));
  }
  // Phase 12b: which slot of its workout's type it fills (checked against the config by checkTrainingIds).
  let slotId: string | undefined;
  if (!isMissing(raw.slotId) && raw.slotId !== '') {
    if (typeof raw.slotId === 'string' && TRAINING_ID_PATTERN.test(raw.slotId)) slotId = raw.slotId;
    else problems.push(msg('plan_slot_unknown'));
  }

  if (problems.length > before) return null;

  const exercise = { exerciseId: raw.exerciseId, sets, ...targets, setTargets, interval };
  const targetError = validatePlanExerciseTargets(exercise);
  if (targetError || sets === undefined) {
    problems.push(targetError ?? msg('plan_exercise_needs_set'));
    return null;
  }

  return { ...exercise, sets, id: optionalId(raw.id), notes, supersetGroup, slotId };
}

/** Structure and per-exercise rules — what even a draft must satisfy to be saved. */
export function parseSavePlanPayload(body: unknown): ParseResult<SavePlanInput> {
  if (!isRecord(body) || !Array.isArray(body.workouts)) {
    return { value: null, issues: [msg('plan_workouts_required')] };
  }
  if (body.workouts.length > MAX_PLAN_WORKOUTS) {
    return { value: null, issues: [msg('plan_too_many_workouts', { max: MAX_PLAN_WORKOUTS })] };
  }

  const issues: PlanProblem[] = [];
  const planProblems: ServerMessage[] = [];
  const notes = readText(body, 'notes', msg('plan_field_plan_notes'), planProblems);
  let aiRecommendationId: string | null | undefined;
  if (body.aiRecommendationId === null) aiRecommendationId = null;
  else if (body.aiRecommendationId !== undefined) {
    if (typeof body.aiRecommendationId === 'string' && mongoose.isValidObjectId(body.aiRecommendationId)) {
      aiRecommendationId = body.aiRecommendationId;
    } else planProblems.push(msg('plan_ai_recommendation_id_invalid'));
  }
  let splitId: string | null | undefined;
  if (body.splitId === null) splitId = null;
  else if (body.splitId !== undefined) {
    if (typeof body.splitId === 'string' && TRAINING_ID_PATTERN.test(body.splitId)) splitId = body.splitId;
    else planProblems.push(msg('plan_split_unknown'));
  }
  issues.push(...planProblems);

  const workouts: PlanWorkoutInputFields[] = [];
  body.workouts.forEach((raw, workoutIndex) => {
    const problems: ServerMessage[] = [];
    const isCardio = isRecord(raw) && raw.kind === 'cardio';
    if (!isRecord(raw) || (!isCardio && !Array.isArray(raw.exercises)) || (!isMissing(raw.kind) && raw.kind !== 'cardio' && raw.kind !== 'strength')) {
      issues.push({ ...msg('plan_workout_invalid'), workoutIndex });
      return;
    }
    // A cardio workout: its blocks instead of exercises (the same rules as the cardio builder's).
    let cardio: PlanCardioFields | undefined;
    if (isCardio) {
      const parsed = parsePlanCardio(raw.cardio);
      if (parsed.value) cardio = parsed.value;
      else problems.push(parsed.error);
      if (Array.isArray(raw.exercises) && raw.exercises.length > 0) problems.push(msg('plan_cardio_no_exercises'));
    }
    const rawExercises: unknown[] = isCardio ? [] : (raw.exercises as unknown[]);

    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!title) problems.push(msg('plan_workout_title_required'));
    else if (title.length > MAX_WORKOUT_TITLE_LENGTH) problems.push(msg('plan_workout_title_too_long', { max: MAX_WORKOUT_TITLE_LENGTH }));

    let dayOfWeek: number | undefined;
    if (!isMissing(raw.dayOfWeek)) {
      const day = raw.dayOfWeek;
      if (typeof day === 'number' && Number.isInteger(day) && day >= MIN_DAY_OF_WEEK && day <= MAX_DAY_OF_WEEK) {
        dayOfWeek = day;
      } else {
        problems.push(msg('plan_day_invalid'));
      }
    }

    const workoutNotes = readText(raw, 'notes', msg('plan_field_workout_notes'), problems);
    let workoutType: string | undefined;
    if (!isMissing(raw.workoutType) && raw.workoutType !== '') {
      if (typeof raw.workoutType === 'string' && TRAINING_ID_PATTERN.test(raw.workoutType)) workoutType = raw.workoutType;
      else problems.push(msg('plan_workout_type_unknown'));
    }
    // The type's suggested slots she removed (coach-only). An id her config no longer has is harmless.
    let hiddenSlotIds: string[] | undefined;
    if (!isMissing(raw.hiddenSlotIds)) {
      const ids = raw.hiddenSlotIds;
      if (Array.isArray(ids) && ids.length <= MAX_HIDDEN_SLOTS && ids.every((id) => typeof id === 'string' && TRAINING_ID_PATTERN.test(id))) {
        if (ids.length > 0) hiddenSlotIds = [...new Set(ids as string[])];
      } else {
        problems.push(msg('plan_slot_unknown'));
      }
    }
    if (rawExercises.length > MAX_WORKOUT_EXERCISES) {
      problems.push(msg('plan_too_many_exercises', { max: MAX_WORKOUT_EXERCISES }));
    }
    issues.push(...problems.map((problem) => ({ ...problem, workoutIndex })));

    const exercises: PlanExerciseInputFields[] = [];
    rawExercises.slice(0, MAX_WORKOUT_EXERCISES).forEach((rawExercise, exerciseIndex) => {
      const exerciseProblems: ServerMessage[] = [];
      const exercise = parseExercise(rawExercise, exerciseProblems);
      if (exercise) exercises.push(exercise);
      issues.push(...exerciseProblems.map((problem) => ({ ...problem, workoutIndex, exerciseIndex })));
    });

    workouts.push({
      id: optionalId(raw.id),
      title,
      dayOfWeek,
      notes: workoutNotes,
      // A cardio workout has no slot template.
      workoutType: isCardio ? undefined : workoutType,
      ...(!isCardio && workoutType && hiddenSlotIds ? { hiddenSlotIds } : {}),
      ...(isCardio && cardio ? { kind: 'cardio' as const, cardio } : {}),
      exercises,
    });
  });

  if (issues.length > 0) return { value: null, issues };
  return { value: { notes, workouts, aiRecommendationId, splitId }, issues: [] };
}

/**
 * Phase 12b: the workout types, slots and split exist in the coach's effective training config.
 * An exercise's slot must belong to its workout's type. Runs on save (also for the AI draft).
 */
export function checkTrainingIds(input: SavePlanInput, config: TrainingConfig): PlanProblem[] {
  const issues: PlanProblem[] = [];
  if (input.splitId && !config.splits.some((split) => split.id === input.splitId)) issues.push(msg('plan_split_unknown'));
  input.workouts.forEach((workout, workoutIndex) => {
    const type = workout.workoutType ? config.workoutTypes.find((candidate) => candidate.id === workout.workoutType) : undefined;
    if (workout.workoutType && !type) issues.push({ ...msg('plan_workout_type_unknown'), workoutIndex });
    workout.exercises.forEach((exercise, exerciseIndex) => {
      if (!exercise.slotId) return;
      if (!workout.workoutType) issues.push({ ...msg('plan_slot_needs_type'), workoutIndex, exerciseIndex });
      else if (type && !type.slots.some((slot) => slot.id === exercise.slotId)) {
        issues.push({ ...msg('plan_slot_unknown'), workoutIndex, exerciseIndex });
      }
    });
  });
  return issues;
}

interface PublishableWorkout {
  kind?: string | null;
  exercises: { supersetGroup?: string | null; interval?: boolean | null }[];
}

/**
 * What a plan must satisfy before the trainee may see it, on top of the draft rules:
 * something to train, and supersets that are real groups (2+ exercises, back to back).
 */
export function findPublishIssues(workouts: PublishableWorkout[]): PlanProblem[] {
  if (workouts.length === 0) {
    return [msg('plan_publish_needs_workout')];
  }

  const issues: PlanProblem[] = [];
  workouts.forEach((workout, workoutIndex) => {
    // A cardio workout's blocks were checked on save (at least one block, durations, rounds).
    if (workout.kind === 'cardio') return;
    if (workout.exercises.length === 0) {
      issues.push({ ...msg('plan_workout_needs_exercise'), workoutIndex });
      return;
    }

    const positions = new Map<string, number[]>();
    workout.exercises.forEach((exercise, exerciseIndex) => {
      if (!exercise.supersetGroup) return;
      positions.set(exercise.supersetGroup, [...(positions.get(exercise.supersetGroup) ?? []), exerciseIndex]);
    });

    for (const [group, indexes] of positions) {
      if (indexes.length < 2) {
        issues.push({ ...msg('plan_superset_too_small', { group }), workoutIndex, exerciseIndex: indexes[0] });
        continue;
      }
      const firstGap = indexes.findIndex((position, i) => i > 0 && position !== indexes[i - 1] + 1);
      if (firstGap !== -1) {
        issues.push({
          ...msg('plan_superset_not_adjacent', { group }),
          workoutIndex,
          exerciseIndex: indexes[firstGap],
        });
      }
      // A circuit runs as one interval timer: all of its exercises are Interval, or none.
      const intervalFlags = indexes.map((index) => Boolean(workout.exercises[index].interval));
      if (intervalFlags.some(Boolean) && !intervalFlags.every(Boolean)) {
        issues.push({
          ...msg('plan_superset_interval_mixed', { group }),
          workoutIndex,
          exerciseIndex: indexes[intervalFlags.indexOf(false)],
        });
      }
    }
  });
  return issues;
}

export interface CreatePlanInput {
  weekStartDate: string;
  duplicatePrevious: boolean;
}

export function parseCreatePlanPayload(body: unknown): { value: CreatePlanInput; error: null } | { value: null; error: ServerMessage } {
  if (!isRecord(body) || typeof body.weekStartDate !== 'string' || !isSunday(body.weekStartDate)) {
    return { value: null, error: msg('plan_week_not_sunday') };
  }
  if (!isMissing(body.duplicatePrevious) && typeof body.duplicatePrevious !== 'boolean') {
    return { value: null, error: msg('plan_duplicate_flag_invalid') };
  }
  return { value: { weekStartDate: body.weekStartDate, duplicatePrevious: body.duplicatePrevious === true }, error: null };
}
