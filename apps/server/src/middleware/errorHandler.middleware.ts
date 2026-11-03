import type { NextFunction, Request, Response } from 'express';

/**
 * The last middleware: an error no controller answered. The client gets only a code (it shows its
 * own fallback sentence when there is no `message`); the details stay in the server log. Never a
 * stack trace or an internal message in the response.
 */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = (error as { status?: unknown; statusCode?: unknown }).status ?? (error as { statusCode?: unknown }).statusCode;
  // body-parser and friends set a 4xx status (bad JSON, too large): a client mistake, not ours.
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ code: status === 413 ? 'payload_too_large' : 'bad_request' });
    return;
  }
  // Method + path only: never the body, headers or query (tokens, passwords, personal data).
  console.error(`[error] ${req.method} ${req.path}:`, error);
  res.status(500).json({ code: 'server_error' });
}
