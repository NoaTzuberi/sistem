import { describe, expect, it } from 'vitest';
import { DEV_CLIENT_ORIGINS, isAllowedOrigin, parseClientOrigins } from '../clientOrigins';
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

describe('isAllowedOrigin', () => {
  const listed = ['https://app.sistem.example'];

  it('development: the list + the apps by their LAN address on a dev port', () => {
    for (const origin of ['http://192.168.1.23:5173', 'http://10.0.0.5:5174', 'http://172.16.4.2:5173', 'https://172.31.0.9:5173']) {
      expect(isAllowedOrigin(origin, listed, 'development')).toBe(true);
    }
    expect(isAllowedOrigin('https://app.sistem.example', listed, 'development')).toBe(true);
  });

  it('development: never a public address, another port or a look-alike host', () => {
    for (const origin of [
      'http://192.168.1.23:8080',
      'http://172.32.0.1:5173',
      'http://11.0.0.1:5173',
      'http://192.168.1.23.evil.example:5173',
      'http://evil.example:5173',
    ]) {
      expect(isAllowedOrigin(origin, listed, 'development')).toBe(false);
    }
    expect(isAllowedOrigin(undefined, listed, 'development')).toBe(false);
  });

  it('production: exactly the list', () => {
    expect(isAllowedOrigin('https://app.sistem.example', listed, 'production')).toBe(true);
    expect(isAllowedOrigin('http://192.168.1.23:5173', listed, 'production')).toBe(false);
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
