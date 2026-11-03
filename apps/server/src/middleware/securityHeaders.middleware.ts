import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/env';

// The API only answers JSON, so the strictest values fit: nothing it sends may load other content,
// run in a frame, or be sniffed as another type. The two front ends are static files on another
// host (GitHub Pages) — their headers are set there, not here.
const HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

// HTTPS only in production (the host terminates TLS); on localhost it would pin http dev ports.
const HSTS = 'max-age=31536000; includeSubDomains';

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  for (const [name, value] of Object.entries(HEADERS)) res.setHeader(name, value);
  if (config.nodeEnv === 'production') res.setHeader('Strict-Transport-Security', HSTS);
  next();
}
