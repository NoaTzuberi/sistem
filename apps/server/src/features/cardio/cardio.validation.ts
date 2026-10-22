import mongoose from 'mongoose';
import type { SaveCardioLogPayload } from '@sistem/types';
import type { PlanCardioFields } from '../plans/plan.types';
import { type ServerMessage, msg } from '../../i18n';
import {
  CARDIO_BLOCK_KIND_IDS,
  CARDIO_METRIC_IDS,
  CARDIO_SPORT_IDS,
  MAX_BLOCK_SEC,
  MAX_CARDIO_LOG_NOTE_LENGTH,
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

export function validateObjectId(value: unknown): ServerMessage | null {
  return typeof value === 'string' && mongoose.isValidObjectId(value) ? null : msg('cardio_workout_id_invalid');
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

/** A cardio plan workout's own content: type, metric and blocks. */
export function parsePlanCardio(value: unknown): Parsed<PlanCardioFields> {
  if (!isRecord(value)) return fail(msg('cardio_steps_invalid'));
  if (!isOneOf(CARDIO_SPORT_IDS, value.sport)) return fail(msg('cardio_sport_invalid'));
  if (!isOneOf(CARDIO_METRIC_IDS, value.metric)) return fail(msg('cardio_metric_invalid'));
  const steps = parseCardioSteps(value.steps);
  if (!steps.value) return steps;
  return { value: { sport: value.sport, metric: value.metric, steps: steps.value }, error: null };
}

/** Her numbers; the service checks them against the workout (rounds, length). */
export function parseSaveCardioLogPayload(body: unknown): Parsed<SaveCardioLogPayload> {
  if (!isRecord(body)) return fail(msg('cardio_log_invalid'));
  // Either a plan workout (planId + workoutId) or her own cardio workout (ownWorkoutId).
  const isOwn = body.ownWorkoutId !== undefined;
  if (isOwn ? validateObjectId(body.ownWorkoutId) : validateObjectId(body.planId) || validateObjectId(body.workoutId)) {
    return fail(msg('cardio_workout_id_invalid'));
  }
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
      ...(isOwn ? { ownWorkoutId: body.ownWorkoutId as string } : { planId: body.planId as string, workoutId: body.workoutId as string }),
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

export const MAX_OWN_CARDIO_TITLE_LENGTH = 60;

/** POST / PUT /cardio/own: a title + the same blocks the coach's cardio builder saves. */
export function parseOwnCardioWorkoutPayload(body: unknown): Parsed<{ title: string; cardio: PlanCardioFields }> {
  if (!isRecord(body)) return fail(msg('invalid_body'));
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length === 0 || title.length > MAX_OWN_CARDIO_TITLE_LENGTH) return fail(msg('own_cardio_title_invalid', { max: MAX_OWN_CARDIO_TITLE_LENGTH }));
  const cardio = parsePlanCardio(body.cardio);
  if (!cardio.value) return cardio;
  return { value: { title, cardio: cardio.value }, error: null };
}
