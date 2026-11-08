import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { config } from '../config/env';
import { sendError } from '../i18n';
import { logSecurityEvent } from './securityLog';

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
    handler: (req: Request, res: Response) => {
      logSecurityEvent('rate_limited', req);
      sendError(res, 429, 'too_many_requests');
    },
  });
}

/**
 * Local development only (NODE_ENV unset / 'development'): 10× the sign-in / join limits. Through the
 * Vite proxy every device (computer, phone, LAN URL) shares one address = one bucket, so testing sign-ups
 * hit 20 in a few minutes. Production and tests keep the real numbers.
 */
const DEV_LIMIT_FACTOR = 10;
function accountLimit(limit: number): number {
  return config.nodeEnv === 'development' ? limit * DEV_LIMIT_FACTOR : limit;
}

/** Login, register, forgot / reset / set password. */
export const authRateLimit = limiter(accountLimit(20), 15);
/** Looking up and accepting /join codes. */
export const joinRateLimit = limiter(accountLimit(60), 15);
/**
 * Reset-link requests per email address (on top of the per-IP limit). The same answer for every
 * address, so it reveals nothing; without an email it falls back to the IP.
 */
export const resetEmailRateLimit = limiter(5, 60, (req) => {
  const email: unknown = req.body?.email;
  return typeof email === 'string' && email.trim() ? `email:${email.trim().toLowerCase()}` : ipKeyGenerator(req.ip ?? '');
});

/** Sending messages (coach ↔ trainee): per signed-in user, after requireAuth. */
export const messageRateLimit = limiter(30, 1, (req) => {
  const userId = (req as Request & { userId?: string }).userId;
  return userId ? `user:${userId}` : ipKeyGenerator(req.ip ?? '');
});

/** Deleting her account (a password check): per signed-in user, after requireAuth. */
export const accountDeleteRateLimit = limiter(5, 15, (req) => {
  const userId = (req as Request & { userId?: string }).userId;
  return userId ? `user:${userId}` : ipKeyGenerator(req.ip ?? '');
});
