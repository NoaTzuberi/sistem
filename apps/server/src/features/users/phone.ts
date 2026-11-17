// Her optional phone (onboarding + Settings), stored in E.164 ("+972541234567") so the coach's call /
// WhatsApp links work. Israeli local numbers ("054-123-4567", "02-1234567") become +972; any other
// country needs its "+" (or "00") prefix.

const SEPARATORS = /[\s\-.()]/g;
const E164_DIGITS = /^[1-9]\d{7,14}$/; // country code first, 8–15 digits in all
const ISRAELI_LOCAL = /^0[2-9]\d{7,8}$/; // 9 digits (landline) or 10 (mobile, 07x)
const ISRAELI_NATIONAL = /^[2-9]\d{7,8}$/; // the same without the leading 0, after +972

export const MAX_PHONE_INPUT_LENGTH = 32;

/** The number in E.164, or null when it isn't a phone number she could be called on. */
export function normalizePhone(input: string): string | null {
  if (input.length > MAX_PHONE_INPUT_LENGTH) return null;
  let value = input.trim().replace(SEPARATORS, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  if (ISRAELI_LOCAL.test(value)) return `+972${value.slice(1)}`;
  if (!value.startsWith('+')) return null;
  const digits = value.slice(1);
  if (!E164_DIGITS.test(digits)) return null;
  if (digits.startsWith('972')) {
    // "+972 054…" is a common slip: drop the trunk 0.
    const national = digits.slice(3).replace(/^0/, '');
    return ISRAELI_NATIONAL.test(national) ? `+972${national}` : null;
  }
  return `+${digits}`;
}

/** The phone part of a payload: a string to set, '' or null to clear. undefined = invalid. */
export function parsePhoneValue(value: unknown): { phone: string | null } | undefined {
  if (value === null || value === '') return { phone: null };
  if (typeof value !== 'string') return undefined;
  if (value.trim() === '') return { phone: null };
  const phone = normalizePhone(value);
  return phone ? { phone } : undefined;
}
