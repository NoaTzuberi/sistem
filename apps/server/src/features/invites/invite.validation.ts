import type { InviteType } from '@sistem/types';
import type { MessageCode } from '../../i18n';
import { INVITE_TYPE_IDS } from './invite.model';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePersonalInvitePayload(body: unknown): { value: { targetEmail: string | null } | null; error: MessageCode } {
  const raw = (body ?? {}) as { targetEmail?: unknown };
  if (raw.targetEmail === undefined || raw.targetEmail === null || raw.targetEmail === '') {
    return { value: { targetEmail: null }, error: 'invalid_body' };
  }
  if (typeof raw.targetEmail !== 'string' || !EMAIL.test(raw.targetEmail.trim()) || raw.targetEmail.length > 254) {
    return { value: null, error: 'email_invalid' };
  }
  return { value: { targetEmail: raw.targetEmail.trim().toLowerCase() }, error: 'invalid_body' };
}

/** Omitted = 'coaching'. */
export function parseInviteTypeParam(value: unknown): InviteType | null {
  if (value === undefined || value === null) return 'coaching';
  return (INVITE_TYPE_IDS as readonly string[]).includes(value as string) ? (value as InviteType) : null;
}
