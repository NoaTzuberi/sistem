import crypto from 'node:crypto';
import type { Request } from 'express';
import { config } from '../config/env';

// One JSON line per security event in the host's log (Render → Logs), easy to search and to alert
// on (e.g. many `login_failed` from one ip). Never a password, token, email or request body: an
// email appears only as a short hash, enough to see repeated attempts on one account.

export type SecurityEvent =
  | 'login_failed'
  | 'login_succeeded'
  | 'password_reset_requested'
  | 'password_reset_done'
  | 'set_password_done'
  | 'forbidden'
  | 'rate_limited'
  | 'admin_action'
  | 'account_deleted';

export function hashEmail(email: unknown): string | undefined {
  if (typeof email !== 'string' || !email.trim()) return undefined;
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 12);
}

export function logSecurityEvent(event: SecurityEvent, req: Request | undefined, fields: Record<string, string | number | undefined> = {}): void {
  if (config.nodeEnv === 'test') return;
  const line = { at: new Date().toISOString(), event, ip: req?.ip, path: req?.path, ...fields };
  console.warn(`[security] ${JSON.stringify(line)}`);
}
