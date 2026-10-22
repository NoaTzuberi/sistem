import mongoose from 'mongoose';
import type { StartFreeWorkoutPayload, StartWorkoutPayload, WorkoutLogSetUpdate, WorkoutSummaryPayload } from '@sistem/types';
import {
  MAX_LOGGED_DURATION_SEC,
  MAX_LOGGED_REPS,
  MAX_LOGGED_WEIGHT,
  MAX_NOTES_LENGTH,
  MAX_RATING,
  MAX_SET_UPDATES,
  MIN_RATING,
} from './workoutLog.constants';
import { type MessageCode, type ServerMessage, msg } from '../../i18n';

export function validateWorkoutLogIdParam(id: unknown): ServerMessage | null {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
    return msg('workout_log_invalid_id');
  }
  return null;
}

type Result<T> = { value: T; error?: undefined } | { value?: undefined; error: ServerMessage };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStartWorkoutPayload(body: unknown): Result<StartWorkoutPayload> {
  if (!isObject(body) || !mongoose.isValidObjectId(body.planId) || !mongoose.isValidObjectId(body.workoutId)) {
    return { error: msg('workout_start_ids_required') };
  }
  return { value: { planId: String(body.planId), workoutId: String(body.workoutId) } };
}

/** undefined = leave as is · null = clear · otherwise a number in range. */
function isOptionalAmount(value: unknown, max: number, integer: boolean): value is number | null | undefined {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) return false;
  return !integer || Number.isInteger(value);
}

function parseSetUpdate(raw: unknown, index: number): Result<WorkoutLogSetUpdate> {
  const n = index + 1;
  if (!isObject(raw)) return { error: msg('log_set_not_object', { n }) };
  if (!mongoose.isValidObjectId(raw.planExerciseId)) return { error: msg('log_set_plan_exercise_invalid', { n }) };
  if (typeof raw.setIndex !== 'number' || !Number.isInteger(raw.setIndex) || raw.setIndex < 0) {
    return { error: msg('log_set_index_invalid', { n }) };
  }
  if (typeof raw.completed !== 'boolean') return { error: msg('log_set_completed_invalid', { n }) };
  if (!isOptionalAmount(raw.reps, MAX_LOGGED_REPS, true)) return { error: msg('log_set_reps_invalid', { n }) };
  if (!isOptionalAmount(raw.weight, MAX_LOGGED_WEIGHT, false)) return { error: msg('log_set_weight_invalid', { n }) };
  if (!isOptionalAmount(raw.durationSec, MAX_LOGGED_DURATION_SEC, true)) return { error: msg('log_set_duration_invalid', { n }) };

  return {
    value: {
      planExerciseId: String(raw.planExerciseId),
      setIndex: raw.setIndex,
      completed: raw.completed,
      ...(raw.reps !== undefined && { reps: raw.reps }),
      ...(raw.weight !== undefined && { weight: raw.weight }),
      ...(raw.durationSec !== undefined && { durationSec: raw.durationSec }),
    },
  };
}

/** `{ sets: [...] }`. With `optional`, a missing body or missing `sets` means no changes. */
export function parseSetUpdates(body: unknown, { optional = false } = {}): Result<WorkoutLogSetUpdate[]> {
  if (optional && (body === undefined || (isObject(body) && body.sets === undefined))) return { value: [] };
  if (!isObject(body) || !Array.isArray(body.sets)) return { error: msg('log_sets_not_array') };
  if (body.sets.length > MAX_SET_UPDATES) return { error: msg('log_too_many_updates', { max: MAX_SET_UPDATES }) };

  const updates: WorkoutLogSetUpdate[] = [];
  for (const [index, raw] of body.sets.entries()) {
    const parsed = parseSetUpdate(raw, index);
    if (parsed.error !== undefined) return { error: parsed.error };
    updates.push(parsed.value);
  }
  return { value: updates };
}

/** `{ rating?, notes? }`: null clears; empty notes clear too. */
export function parseSummaryPayload(body: unknown): Result<WorkoutSummaryPayload> {
  if (!isObject(body)) return { error: msg('summary_not_object') };
  const value: WorkoutSummaryPayload = {};

  if (body.rating === null) value.rating = null;
  else if (body.rating !== undefined) {
    if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < MIN_RATING || body.rating > MAX_RATING) {
      return { error: msg('summary_rating_invalid', { min: MIN_RATING, max: MAX_RATING }) };
    }
    value.rating = body.rating;
  }

  if (body.notes === null) value.notes = null;
  else if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') return { error: msg('summary_notes_not_text') };
    const notes = body.notes.trim();
    if (notes.length > MAX_NOTES_LENGTH) return { error: msg('summary_notes_too_long', { max: MAX_NOTES_LENGTH }) };
    value.notes = notes === '' ? null : notes;
  }
  return { value };
}

const FREE_MUSCLE_IDS = ['chest', 'back', 'shoulders', 'arms', 'core', 'glutes', 'legs', 'full_body'];

/** POST /workout-logs/free: { mode: 'scratch' } | { mode: 'repeat', fromLogId } | { mode: 'muscle', muscles }. */
export function parseStartFreeWorkoutPayload(body: unknown): { value: StartFreeWorkoutPayload; error?: undefined } | { value?: undefined; error: MessageCode } {
  const raw = (body ?? {}) as { mode?: unknown; fromLogId?: unknown; muscles?: unknown };
  if (raw.mode === 'scratch') return { value: { mode: 'scratch' } };
  if (raw.mode === 'repeat') {
    if (typeof raw.fromLogId !== 'string' || raw.fromLogId.length === 0) return { error: 'invalid_body' };
    return { value: { mode: 'repeat', fromLogId: raw.fromLogId } };
  }
  if (raw.mode === 'muscle') {
    if (!Array.isArray(raw.muscles) || raw.muscles.length === 0) return { error: 'free_workout_muscles_required' };
    if (raw.muscles.some((muscle) => typeof muscle !== 'string' || !FREE_MUSCLE_IDS.includes(muscle))) return { error: 'invalid_body' };
    return { value: { mode: 'muscle', muscles: [...new Set(raw.muscles as string[])] } };
  }
  return { error: 'invalid_body' };
}
