import type { CoachProfileStatus, CreateCoachPayload } from '@sistem/types';
import type { MessageCode } from '../../i18n';
import { COACH_PROFILE_STATUS_IDS } from '../coachProfiles/coachProfile.model';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCreateCoachPayload(body: unknown): { value: CreateCoachPayload | null; error: MessageCode } {
  const raw = (body ?? {}) as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!name || name.length > 80) return { value: null, error: 'name_required' };
  if (!EMAIL.test(email) || email.length > 254) return { value: null, error: 'email_invalid' };
  return { value: { name, email }, error: 'invalid_body' };
}

export function parseCoachStatus(body: unknown): CoachProfileStatus | null {
  const status = (body as { status?: unknown } | null)?.status;
  return (COACH_PROFILE_STATUS_IDS as readonly unknown[]).includes(status) ? (status as CoachProfileStatus) : null;
}

/** The user search: 2–100 characters (a shorter query would list everyone). */
export function parseUserSearchQuery(query: unknown): string | null {
  const text = typeof query === 'string' ? query.trim() : '';
  return text.length >= 2 && text.length <= 100 ? text : null;
}

export function parseChangeEmailPayload(body: unknown): string | null {
  const raw = (body as { email?: unknown } | null)?.email;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return EMAIL.test(email) && email.length <= 254 ? email : null;
}
