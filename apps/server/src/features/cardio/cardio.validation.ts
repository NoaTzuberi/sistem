import mongoose from 'mongoose';
import type { SaveCardioLogPayload, SaveCardioSessionPayload } from '@sistem/types';
import { isDateString, isSunday } from '../plans/planWeek';
import { MAX_DAY_OF_WEEK, MIN_DAY_OF_WEEK } from '../plans/plan.constants';
import { type ServerMessage, msg } from '../../i18n';
import {
  CARDIO_BLOCK_KIND_IDS,
  CARDIO_METRIC_IDS,
  CARDIO_SESSION_STATUS_IDS,
  CARDIO_SPORT_IDS,
  MAX_BLOCK_SEC,
  MAX_CARDIO_LOG_NOTE_LENGTH,
  MAX_CARDIO_NAME_LENGTH,
  MAX_CARDIO_NOTE_LENGTH,
  MAX_CARDIO_STEPS,
  MAX_DISTANCE_KM,
  MAX_INTENSITY,
  MAX_REPEAT_BLOCKS,
  MAX_REPEAT_TIMES,
  MAX_STEP_ID_LENGTH,
  MIN_BLOCK_SEC,
  MIN_INTENSITY,
  MIN_REPEAT_TIMES,
} from './cardio.constants';
import type { CardioBlockFields, CardioStepFields } from './cardio.types';

type Parsed<T> = { value: T; error: null } | { value: null; error: ServerMessage };

const fail = (error: ServerMessage) => ({ value: null, error }) as const;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isIntIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const isOneOf = <T extends string>(ids: readonly T[], value: unknown): value is T => typeof value === 'string' && (ids as readonly string[]).includes(value);
const isStepId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= MAX_STEP_ID_LENGTH;

export function validateCardioSessionId(value: unknown): ServerMessage | null {
  return typeof value === 'string' && mongoose.isValidObjectId(value) ? null : msg('cardio_session_id_invalid');
}

export function validateCardioWeekQuery(value: unknown): ServerMessage | null {
  return value === undefined || (typeof value === 'string' && isSunday(value)) ? null : msg('cardio_week_invalid');
}

export function validateCardioDateQuery(value: unknown): ServerMessage | null {
  return isDateString(value) ? null : msg('body_date_invalid');
}

function parseBlock(value: unknown): Parsed<CardioBlockFields> {
  if (!isRecord(value) || value.type !== 'block' || !isStepId(value.id) || !isOneOf(CARDIO_BLOCK_KIND_IDS, value.kind)) {
    return fail(msg('cardio_steps_invalid'));
  }
  if (!isIntIn(value.durationSec, MIN_BLOCK_SEC, MAX_BLOCK_SEC)) return fail(msg('cardio_block_duration'));
  if (!isIntIn(value.intensity, MIN_INTENSITY, MAX_INTENSITY)) return fail(msg('cardio_block_intensity'));
  return { value: { type: 'block', id: value.id, kind: value.kind, durationSec: value.durationSec, intensity: value.intensity }, error: null };
}

/** Blocks and repeat sets (no nesting deeper than one set); at least one block in all. */
export function parseCardioSteps(value: unknown): Parsed<CardioStepFields[]> {
  if (!Array.isArray(value) || value.length > MAX_CARDIO_STEPS) return fail(msg('cardio_steps_invalid'));
  const steps: CardioStepFields[] = [];
  for (const raw of value) {
    if (isRecord(raw) && raw.type === 'repeat') {
      if (!isStepId(raw.id) || !Array.isArray(raw.blocks) || raw.blocks.length > MAX_REPEAT_BLOCKS) return fail(msg('cardio_steps_invalid'));
      if (!isIntIn(raw.times, MIN_REPEAT_TIMES, MAX_REPEAT_TIMES)) return fail(msg('cardio_repeat_times'));
      if (raw.blocks.length === 0) return fail(msg('cardio_steps_empty'));
      const blocks: CardioBlockFields[] = [];
      for (const rawBlock of raw.blocks) {
        const block = parseBlock(rawBlock);
        if (!block.value) return block;
        blocks.push(block.value);
      }
      steps.push({ type: 'repeat', id: raw.id, times: raw.times, blocks });
    } else {
      const block = parseBlock(raw);
      if (!block.value) return block;
      steps.push(block.value);
    }
  }
  if (steps.length === 0) return fail(msg('cardio_steps_empty'));
  return { value: steps, error: null };
}

function parseNote(value: unknown, max: number): Parsed<string | null> {
  if (value === undefined || value === null) return { value: null, error: null };
  if (typeof value !== 'string' || value.trim().length > max) return fail(msg('cardio_note_too_long', { max }));
  return { value: value.trim() || null, error: null };
}

export function parseSaveCardioSessionPayload(body: unknown): Parsed<SaveCardioSessionPayload & { steps: CardioStepFields[] }> {
  if (!isRecord(body)) return fail(msg('cardio_steps_invalid'));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length === 0 || name.length > MAX_CARDIO_NAME_LENGTH) return fail(msg('cardio_name_invalid', { max: MAX_CARDIO_NAME_LENGTH }));
  if (!isOneOf(CARDIO_SPORT_IDS, body.sport)) return fail(msg('cardio_sport_invalid'));
  if (!isOneOf(CARDIO_METRIC_IDS, body.metric)) return fail(msg('cardio_metric_invalid'));
  if (!isOneOf(CARDIO_SESSION_STATUS_IDS, body.status)) return fail(msg('cardio_status_invalid'));
  if (typeof body.weekStartDate !== 'string' || !isSunday(body.weekStartDate)) return fail(msg('cardio_week_invalid'));
  if (typeof body.repeatsWeekly !== 'boolean') return fail(msg('cardio_steps_invalid'));

  const days = body.days;
  if (!Array.isArray(days) || !days.every((day) => isIntIn(day, MIN_DAY_OF_WEEK, MAX_DAY_OF_WEEK)) || new Set(days).size !== days.length) {
    return fail(msg('cardio_days_invalid'));
  }
  // A draft may be unscheduled; one in her app needs a day.
  if (body.status === 'active' && days.length === 0) return fail(msg('cardio_days_required'));

  const steps = parseCardioSteps(body.steps);
  if (!steps.value) return steps;
  const note = parseNote(body.note, MAX_CARDIO_NOTE_LENGTH);
  if (note.error) return note;

  return {
    value: {
      name,
      sport: body.sport,
      metric: body.metric,
      steps: steps.value,
      note: note.value,
      days: [...(days as number[])].sort((a, b) => a - b),
      repeatsWeekly: body.repeatsWeekly,
      weekStartDate: body.weekStartDate,
      status: body.status,
    },
    error: null,
  };
}

/** Her numbers; the service checks them against the session (rounds, length). */
export function parseSaveCardioLogPayload(body: unknown): Parsed<SaveCardioLogPayload> {
  if (!isRecord(body)) return fail(msg('cardio_log_invalid'));
  if (validateCardioSessionId(body.sessionId)) return fail(msg('cardio_session_id_invalid'));
  if (!isDateString(body.date)) return fail(msg('body_date_invalid'));
  const counts = [body.completedSec, body.roundsDone, body.highIntensitySec];
  if (!counts.every((value) => isIntIn(value, 0, Number.MAX_SAFE_INTEGER))) return fail(msg('cardio_log_invalid'));
  if (!isIntIn(body.rpe, 1, 10)) return fail(msg('cardio_rpe_invalid'));
  const distance = body.distanceKm;
  if (distance !== undefined && distance !== null && !(typeof distance === 'number' && Number.isFinite(distance) && distance >= 0 && distance <= MAX_DISTANCE_KM)) {
    return fail(msg('cardio_distance_invalid', { max: MAX_DISTANCE_KM }));
  }
  const note = parseNote(body.note, MAX_CARDIO_LOG_NOTE_LENGTH);
  if (note.error) return note;
  return {
    value: {
      sessionId: body.sessionId as string,
      date: body.date,
      completedSec: body.completedSec as number,
      roundsDone: body.roundsDone as number,
      highIntensitySec: body.highIntensitySec as number,
      // Steps of 100 m: stored to one decimal.
      distanceKm: typeof distance === 'number' && distance > 0 ? Math.round(distance * 10) / 10 : null,
      rpe: body.rpe,
      note: note.value,
    },
    error: null,
  };
}
