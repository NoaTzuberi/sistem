import type { CoachSendDefault } from '@sistem/types';
import { msg } from '../../i18n';
import type { MessageCode, ServerMessage } from '../../i18n';

export const MAX_DEFAULT_MESSAGE_LENGTH = 600;
export const MAX_DEFAULT_TIP_LENGTH = 300;
const KINDS = ['nutrition', 'workouts'] as const;
const FIELDS = ['message', 'tip'] as const;
const LIMITS: Record<(typeof FIELDS)[number], { max: number; error: MessageCode }> = {
  message: { max: MAX_DEFAULT_MESSAGE_LENGTH, error: 'coach_default_message_too_long' },
  tip: { max: MAX_DEFAULT_TIP_LENGTH, error: 'coach_default_tip_too_long' },
};

type Changes = Partial<Record<(typeof KINDS)[number], Partial<CoachSendDefault>>>;
type Parsed = { value: Changes; error?: undefined } | { value?: undefined; error: ServerMessage | MessageCode };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** PATCH /coach/profile/defaults: `{ nutrition?: { message?, tip? }, workouts?: { … } }`; trimmed (line breaks kept), '' / null clears. */
export function parseCoachDefaultsPayload(body: unknown): Parsed {
  if (!isRecord(body) || Object.keys(body).some((key) => !(KINDS as readonly string[]).includes(key))) return { error: 'invalid_body' };
  const value: Changes = {};
  for (const kind of KINDS) {
    const raw = body[kind];
    if (raw === undefined) continue;
    if (!isRecord(raw) || Object.keys(raw).some((key) => !(FIELDS as readonly string[]).includes(key))) return { error: 'invalid_body' };
    const changes: Partial<CoachSendDefault> = {};
    for (const field of FIELDS) {
      const input = raw[field];
      if (input === undefined) continue;
      if (input !== null && typeof input !== 'string') return { error: 'invalid_body' };
      const text = (input ?? '').replace(/\r\n/g, '\n').trim();
      if (text.length > LIMITS[field].max) return { error: msg(LIMITS[field].error, { max: LIMITS[field].max }) };
      changes[field] = text || null;
    }
    value[kind] = changes;
  }
  return { value };
}
