import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@sistem/types';
import { config } from '../config/env';
import { User, hasRole } from '../features/users/user.model';
import { isCoachActive } from '../features/coachProfiles/coachProfile.service';
import { sendError } from '../i18n';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
  /** Set by loadCoachTrainee: a trainee the calling coach is allowed to see. */
  traineeId?: string;
  /** Set by loadCoachTrainee: the live coaching (this coach ↔ that trainee) — coach-owned data is read through it. */
  coachingId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 401, 'auth_required');
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    sendError(res, 401, 'invalid_token');
  }
}

/**
 * Use after requireAuth. Roles are read from the database on every request (never from the JWT or
 * the client), so a change takes effect without a new token. A coach must also have an ACTIVE coach
 * profile: suspending her closes every coach route at once.
 */
export function requireRole(role: UserRole) {
  return async function requireRoleMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.userId) {
      sendError(res, 401, 'auth_required');
      return;
    }

    const user = await User.findById(req.userId).select('roles');
    if (!user) {
      sendError(res, 401, 'invalid_token');
      return;
    }

    if (!hasRole(user, role)) {
      sendError(res, 403, 'forbidden');
      return;
    }

    if (role === 'coach' && !(await isCoachActive(user._id))) {
      sendError(res, 403, 'coach_suspended');
      return;
    }

    req.userRole = role;
    next();
  };
}
