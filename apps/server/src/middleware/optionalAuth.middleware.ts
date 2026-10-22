import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import type { AuthenticatedRequest } from './auth.middleware';

/** Sets req.userId when a valid token is sent; otherwise continues signed out (never 401). */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.userId = (jwt.verify(header.slice('Bearer '.length), config.jwtSecret) as { sub: string }).sub;
    } catch {
      // A stale token on a public page: treat as signed out.
    }
  }
  next();
}
