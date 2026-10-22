import type { AddressInfo } from 'net';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import app from '../app';
import { config } from '../config/env';
import { User } from '../features/users/user.model';
import type { UserDocument } from '../features/users/user.model';
import type { UserRole } from '@sistem/types';
import { ensureCoachSetup } from '../features/coachProfiles/coachProfile.service';
import { Coaching } from '../features/coachings/coaching.model';
import { getPrimaryCommunityId, joinCommunity } from '../features/communities/community.service';

// Test helper: runs the real Express app (every middleware and route) on a random
// port and calls it with Node's built-in fetch — no extra test dependency.

interface RequestOptions {
  token?: string;
  body?: unknown;
  /** A raw body (e.g. a photo upload) instead of JSON. */
  raw?: { data: Buffer; contentType: string };
  /**
   * Accept-Language (Phase 15). Tests read English messages by default; 'he' checks the
   * Hebrew ones, null sends no header (the server's default, Hebrew).
   */
  language?: 'he' | 'en' | null;
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

export interface ApiTestClient {
  request<T = any>(method: string, path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  close(): Promise<void>;
}

export async function startApiTestClient(): Promise<ApiTestClient> {
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;

  return {
    async request(method, path, { token, body, raw, language = 'en' } = {}) {
      const headers: Record<string, string> = {};
      if (language) headers['Accept-Language'] = language;
      if (token) headers.Authorization = `Bearer ${token}`;
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (raw) headers['Content-Type'] = raw.contentType;
      const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
        method,
        headers,
        body: raw ? new Uint8Array(raw.data) : body === undefined ? undefined : JSON.stringify(body),
      });
      // Express's own 404 page is HTML, not JSON.
      const isJson = response.headers.get('content-type')?.includes('application/json');
      return { status: response.status, body: isJson ? await response.json() : await response.text() };
    },
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

export function tokenFor(userId: Types.ObjectId | string): string {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '1h' });
}

/**
 * Test shorthand, kept from before accounts & relationships: `role` = her one role, `coachId` = she
 * joined that coach (a live Coaching, status `coachingStatus` — default 'waiting' — + the coach's
 * primary community). A coach gets her profile + primary community, like an admin-created one.
 */
type TestUserFields = Omit<Partial<UserDocument>, 'roles'> & {
  role?: UserRole;
  roles?: UserRole[];
  coachId?: Types.ObjectId | string | null;
  coachingStatus?: 'waiting' | 'active';
};

/** Creates a user directly (no bcrypt — these tests never log in with a password). */
export async function createTestUser(email: string, fields: TestUserFields = {}) {
  const { role, roles, coachId, coachingStatus = 'waiting', ...rest } = fields;
  const user = await User.create({
    name: email.split('@')[0],
    email,
    passwordHash: 'not-a-real-hash',
    roles: roles ?? [role ?? 'trainee'],
    ...rest,
  });
  if (user.roles.includes('coach')) await ensureCoachSetup(user._id, user.name);
  let coachingId: string | null = null;
  if (coachId) {
    // Joined before (or as) she onboarded — the usual invite flow — so the 48h window counts from onboarding.
    const joinedAt = new Date(Math.min(user.createdAt.getTime(), user.onboardingCompletedAt?.getTime() ?? Infinity));
    const coaching = await Coaching.create({ traineeId: user._id, coachId, status: coachingStatus, startedAt: joinedAt });
    coachingId = String(coaching._id);
    const communityId = await getPrimaryCommunityId(coachId);
    if (communityId) await joinCommunity(user._id, communityId);
  }
  return { user, id: String(user._id), token: tokenFor(user._id), coachingId };
}
