import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { config } from '../config/env';
import { sendError } from '../i18n';

// Per-IP limits on the endpoints that guess or create accounts: login / register / password
// links, and the join codes. In-memory (resets on restart; one server for now — a shared store is
// needed only with several server instances). Off in tests unless a test turns it on.

let enabledInTests = false;

/** Tests only. */
export function setRateLimitForTests(enabled: boolean): void {
  enabledInTests = enabled;
}

function limiter(limit: number, windowMinutes: number, keyGenerator?: (req: Request) => string) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    ...(keyGenerator ? { keyGenerator } : {}),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.nodeEnv === 'test' && !enabledInTests,
    handler: (_req: Request, res: Response) => sendError(res, 429, 'too_many_requests'),
  });
}

/** Login, register, forgot / reset / set password. */
export const authRateLimit = limiter(20, 15);
/** Looking up and accepting /join codes. */
export const joinRateLimit = limiter(60, 15);
/**
 * Reset-link requests per email address (on top of the per-IP limit). The same answer for every
 * address, so it reveals nothing; without an email it falls back to the IP.
 */
export const resetEmailRateLimit = limiter(5, 60, (req) => {
  const email: unknown = req.body?.email;
  return typeof email === 'string' && email.trim() ? `email:${email.trim().toLowerCase()}` : ipKeyGenerator(req.ip ?? '');
});
