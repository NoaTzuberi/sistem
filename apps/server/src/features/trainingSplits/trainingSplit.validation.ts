import type { TrainingSettingsPayload, TrainingSlot } from '@sistem/types';
import { PATTERN_IDS, type PatternId } from '../exercises/exercise.constants';
import { msg, type ServerMessage } from '../../i18n';
import { DEFAULT_SPLITS, DEFAULT_WORKOUT_TYPES, MAX_TRAINING_DAYS } from './trainingSplit.config';

// The coach's training overrides. Only known workout types / splits can be changed (adding new
// ones needs labels — that comes with the settings screen). Developer-facing details for now.

const ID_PATTERN = /^[a-z0-9_]{1,40}$/;
const MAX_SLOTS = 12;
const MAX_EXERCISES_PER_SLOT = 6;
const LABEL_MAX = 60;

type Result = { value: TrainingSettingsPayload; error?: undefined } | { value?: undefined; error: ServerMessage };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const fail = (detail: string): Result => ({ error: msg('training_settings_invalid', { detail }) });

function parseSlot(raw: unknown): TrainingSlot | string {
  if (!isObject(raw)) return 'a slot must be an object';
  // `required` (old settings) is accepted and dropped: slots are suggestions (owner, 2026-10-28).
  const { id, patterns, maxExercises, label } = raw;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return 'slot id must be lower_snake_case';
  if (!Array.isArray(patterns) || patterns.length === 0 || !patterns.every((p) => PATTERN_IDS.includes(p as PatternId))) {
    return `slot ${id}: patterns must be known pattern ids`;
  }
  if (!Number.isInteger(maxExercises) || (maxExercises as number) < 1 || (maxExercises as number) > MAX_EXERCISES_PER_SLOT) {
    return `slot ${id}: maxExercises must be 1–${MAX_EXERCISES_PER_SLOT}`;
  }
  if (label !== undefined && (typeof label !== 'string' || label.trim().length === 0 || label.length > LABEL_MAX)) {
    return `slot ${id}: label must be short text`;
  }
  return { id, patterns: [...new Set(patterns as PatternId[])], maxExercises: maxExercises as number, ...(label ? { label: (label as string).trim() } : {}) };
}

export function parseTrainingSettingsPayload(body: unknown): Result {
  if (!isObject(body)) return fail('body must be an object');
  const knownTypes = new Set(DEFAULT_WORKOUT_TYPES.map((type) => type.id));
  const knownSplits = new Set(DEFAULT_SPLITS.map((split) => split.id));
  const value: TrainingSettingsPayload = { workoutTypes: {}, splits: {} };

  if (body.workoutTypes !== undefined) {
    if (!isObject(body.workoutTypes)) return fail('workoutTypes must be an object');
    for (const [typeId, raw] of Object.entries(body.workoutTypes)) {
      if (!knownTypes.has(typeId)) return fail(`unknown workout type ${typeId}`);
      if (!isObject(raw) || !Array.isArray(raw.slots) || raw.slots.length === 0 || raw.slots.length > MAX_SLOTS) {
        return fail(`${typeId}: slots must be a list of 1–${MAX_SLOTS}`);
      }
      const slots: TrainingSlot[] = [];
      for (const rawSlot of raw.slots) {
        const slot = parseSlot(rawSlot);
        if (typeof slot === 'string') return fail(`${typeId}: ${slot}`);
        if (slots.some((other) => other.id === slot.id)) return fail(`${typeId}: slot ${slot.id} twice`);
        slots.push(slot);
      }
      value.workoutTypes![typeId] = { slots };
    }
  }

  if (body.splits !== undefined) {
    if (!isObject(body.splits)) return fail('splits must be an object');
    for (const [splitId, raw] of Object.entries(body.splits)) {
      if (!knownSplits.has(splitId)) return fail(`unknown split ${splitId}`);
      if (!isObject(raw)) return fail(`${splitId} must be an object`);
      const entry: { enabled?: boolean; days?: Record<string, string[]> } = {};
      if (raw.enabled !== undefined) {
        if (typeof raw.enabled !== 'boolean') return fail(`${splitId}: enabled must be true or false`);
        entry.enabled = raw.enabled;
      }
      if (raw.days !== undefined) {
        if (!isObject(raw.days)) return fail(`${splitId}: days must be an object`);
        const days: Record<string, string[]> = {};
        for (const [count, types] of Object.entries(raw.days)) {
          const n = Number(count);
          if (!Number.isInteger(n) || n < 1 || n > MAX_TRAINING_DAYS) return fail(`${splitId}: day count ${count} must be 1–${MAX_TRAINING_DAYS}`);
          if (!Array.isArray(types) || types.length !== n || !types.every((type) => knownTypes.has(type as string))) {
            return fail(`${splitId}: ${count} days need ${count} known workout types`);
          }
          days[String(n)] = types as string[];
        }
        entry.days = days;
      }
      value.splits![splitId] = entry;
    }
  }
  return { value };
}
