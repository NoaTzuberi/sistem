import { describe, expect, it } from 'vitest';
import { DEV_CLIENT_ORIGINS, parseClientOrigins } from '../clientOrigins';
import { getHealth } from '../../features/health/health.controller';
import type { Request, Response } from 'express';

describe('parseClientOrigins', () => {
  it('reads a comma-separated list and keeps only the origin of each address', () => {
    expect(parseClientOrigins(' https://name.github.io/sistem/ , http://localhost:5173', 'production')).toEqual([
      'https://name.github.io',
      'http://localhost:5173',
    ]);
  });

  it('never accepts a wildcard or something that is not a web address', () => {
    expect(parseClientOrigins('*', 'production')).toEqual([]);
    expect(parseClientOrigins('*, name.github.io, ftp://files.example', 'production')).toEqual([]);
  });

  it('unset: the local apps in development, nothing in production', () => {
    expect(parseClientOrigins(undefined, 'development')).toEqual(DEV_CLIENT_ORIGINS);
    expect(DEV_CLIENT_ORIGINS).toEqual(
      expect.arrayContaining(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']),
    );
    expect(parseClientOrigins('', 'production')).toEqual([]);
  });
});

describe('GET /api/health', () => {
  it('answers 200 { ok: true }', () => {
    let statusCode = 200;
    let body: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(payload: unknown) {
        body = payload;
        return res;
      },
    };
    getHealth({} as Request, res as unknown as Response);
    expect(statusCode).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});
