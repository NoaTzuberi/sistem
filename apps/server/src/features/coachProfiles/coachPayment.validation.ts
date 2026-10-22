import type { CoachPayment, UpdateCoachPaymentPayload } from '@sistem/types';
import type { MessageCode } from '../../i18n';

export const MAX_PAYMENT_NOTE_LENGTH = 140;
const MAX_URL_LENGTH = 300;
const FIELDS = ['payboxUrl', 'bitPhone', 'note'] as const;

/**
 * https only: no javascript: / data: / http:, no user:password@, a real host. Returned normalized
 * (URL.href), so what is stored is exactly what the app opens.
 */
export function sanitizePaymentUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null;
  return url.href;
}

/** Israeli mobile: 05X-XXXXXXX, +972 5X…, 9725X… (spaces / dashes / dots allowed) → 05XXXXXXXX. */
export function normalizeIsraeliMobile(value: string): string | null {
  const digits = value.replace(/[\s\-.()]/g, '');
  const local = digits.replace(/^\+?972/, '0');
  return /^05\d{8}$/.test(local) ? local : null;
}

type Parsed = { value: Partial<CoachPayment>; error?: undefined } | { value?: undefined; error: MessageCode };

/** PUT /coach/profile/payment: only the fields sent change; null or '' clears one. */
export function parseCoachPaymentPayload(body: unknown): Parsed {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid_body' };
  const raw = body as UpdateCoachPaymentPayload & Record<string, unknown>;
  if (Object.keys(raw).some((key) => !(FIELDS as readonly string[]).includes(key))) return { error: 'invalid_body' };
  const value: Partial<CoachPayment> = {};
  for (const field of FIELDS) {
    const input = raw[field];
    if (input === undefined) continue;
    if (input !== null && typeof input !== 'string') return { error: 'invalid_body' };
    if (input === null || input.trim() === '') {
      value[field] = null;
      continue;
    }
    if (field === 'payboxUrl') {
      const url = sanitizePaymentUrl(input);
      if (!url) return { error: 'payment_url_invalid' };
      value.payboxUrl = url;
    } else if (field === 'bitPhone') {
      const phone = normalizeIsraeliMobile(input);
      if (!phone) return { error: 'payment_phone_invalid' };
      value.bitPhone = phone;
    } else {
      const note = input.trim();
      if (note.length > MAX_PAYMENT_NOTE_LENGTH) return { error: 'payment_note_too_long' };
      value.note = note;
    }
  }
  return { value };
}
