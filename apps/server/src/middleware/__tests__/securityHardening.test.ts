import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { config } from '../../config/env';
import { parseTrustProxy } from '../../config/trustProxy';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../features/exercises/__tests__/testDb';
import { createTestUser } from '../../testing/apiTestClient';
import { User } from '../../features/users/user.model';

// Security audit 2026-11-03: response headers, error bodies, JWT algorithm, the ADMIN_EMAIL sign-up
// guard, the public search cap and the proxy setting.

let server: Server;
let base: string;

beforeAll(async () => {
  await connectTestDatabase();
  server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe('security headers', () => {
  it('sends the strict API headers and hides the framework', async () => {
    const response = await fetch(`${base}/health`);
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('permissions-policy')).toContain('camera=()');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});

describe('error responses', () => {
  it('answers broken JSON with a JSON code and no stack trace', async () => {
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":' });
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ code: 'bad_request' });
    expect(text).not.toMatch(/at .*\.(js|ts):\d+/);
  });

  it('answers an over-size JSON body with 413 as JSON', async () => {
    const response = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'x'.repeat(200_000) }),
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ code: 'payload_too_large' });
  });
});

describe('JWT', () => {
  it('refuses a token signed with another algorithm', async () => {
    const { user } = await createTestUser('t@example.com');
    const forged = jwt.sign({ sub: String(user._id), sv: 0 }, config.jwtSecret, { algorithm: 'HS512' });
    const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${forged}` } });
    expect(response.status).toBe(401);
  });

  it('refuses an unsigned token', async () => {
    const { user } = await createTestUser('t@example.com');
    const unsigned = jwt.sign({ sub: String(user._id), sv: 0 }, '', { algorithm: 'none' });
    const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${unsigned}` } });
    expect(response.status).toBe(401);
  });
});

describe('ADMIN_EMAIL sign-up guard', () => {
  it('never lets a public sign-up take the admin address', async () => {
    const previous = config.adminEmail;
    config.adminEmail = 'boss@example.com';
    try {
      const response = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Eve', email: 'Boss@Example.com', password: 'long-enough-1' }),
      });
      expect(response.status).toBe(409);
      expect(await User.countDocuments({ email: 'boss@example.com' })).toBe(0);
    } finally {
      config.adminEmail = previous;
    }
  });
});

describe('public exercise search', () => {
  it('refuses a search longer than 100 characters', async () => {
    const response = await fetch(`${base}/exercises?search=${'a'.repeat(101)}`);
    expect(response.status).toBe(400);
  });
});

describe('parseTrustProxy', () => {
  it('accepts only a whole hop count', () => {
    expect(parseTrustProxy(undefined)).toBe(0);
    expect(parseTrustProxy('')).toBe(0);
    expect(parseTrustProxy('true')).toBe(0);
    expect(parseTrustProxy('-1')).toBe(0);
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(' 2 ')).toBe(2);
    expect(parseTrustProxy('99')).toBe(10);
  });
});
