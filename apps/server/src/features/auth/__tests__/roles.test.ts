import { ensureCoachSetup } from '../../coachProfiles/coachProfile.service';
import { CoachProfile } from '../../coachProfiles/coachProfile.model';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@sistem/types';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { User } from '../../users/user.model';
import { register } from '../auth.controller';
import { getCurrentUser, loginUser } from '../auth.service';
import { resolveAppState } from '../../users/appState.service';
import { requireRole } from '../../../middleware/auth.middleware';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { describeDatabaseUrl } from '../../users/scripts/devDatabaseGuard';

const PASSWORD = 'password123';

function mockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

async function registerViaController(body: Record<string, unknown>) {
  const res = mockResponse();
  await register({ body } as Request, res as unknown as Response);
  return res;
}

async function runRequireRole(userId: string | undefined) {
  const res = mockResponse();
  const next = vi.fn() as unknown as NextFunction;
  await requireRole('coach')({ userId } as AuthenticatedRequest, res as unknown as Response, next);
  return { res, next };
}

describe('roles and app state', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('sign-up always creates a trainee, even when the body asks for coach', async () => {
    const res = await registerViaController({
      name: 'Sneaky',
      email: 'sneaky@example.com',
      password: PASSWORD,
      role: 'coach',
    });

    expect(res.statusCode).toBe(201);
    const stored = await User.findOne({ email: 'sneaky@example.com' });
    expect(stored?.roles).toEqual(['trainee']);
    expect((res.body as { user: { role: string } }).user.role).toBe('trainee');
  });

  it('a new trainee without an invite starts on the "how do you want to train" choice', async () => {
    const res = await registerViaController({ name: 'New', email: 'new@example.com', password: PASSWORD });
    const { user } = res.body as { user: { appState: string; onboardingStatus: string; onboardingCompleted: boolean } };
    expect(user.onboardingStatus).toBe('not_started');
    expect(user.onboardingCompleted).toBe(false);
    expect(user.appState).toBe('choose_path');
  });

  it('an onboarded trainee without any coach is self-guided (Home)', async () => {
    await registerViaController({ name: 'Done', email: 'done@example.com', password: PASSWORD });
    const stored = await User.findOneAndUpdate({ email: 'done@example.com' }, { onboardingStatus: 'completed' }, { new: true });

    const user = await getCurrentUser(String(stored!._id));
    expect(user.appState).toBe('home');
    expect(user.coachingStatus).toBeNull();
  });

  it('a coach resolves to the coach state on login', async () => {
    await registerViaController({ name: 'Coach', email: 'coach@example.com', password: PASSWORD });
    await User.updateOne({ email: 'coach@example.com' }, { roles: ['coach'] });

    const { user } = await loginUser('coach@example.com', PASSWORD);
    expect(user.role).toBe('coach');
    expect(user.appState).toBe('coach');
  });

  it('resolveAppState follows the PRD §4.2 table', () => {
    const trainee = (onboardingStatus: 'not_started' | 'in_progress' | 'completed', extra: { selfGuidedAt?: Date; onboardingCompletedAt?: Date } = {}) => ({
      roles: ['trainee' as const],
      onboardingStatus,
      onboardingCompletedAt: onboardingStatus === 'completed' ? new Date('2026-01-10') : null,
      ...extra,
    });
    const none = { coaching: null, hasPlan: false };
    const waiting = (startedAt: string) => ({ coaching: { status: 'waiting' as const, startedAt: new Date(startedAt) }, hasPlan: false });
    // First run: no coach and no choice yet → "how do you want to train"; a choice or a coach → questionnaire.
    expect(resolveAppState(trainee('not_started'), none)).toBe('choose_path');
    expect(resolveAppState(trainee('not_started', { selfGuidedAt: new Date() }), none)).toBe('onboarding');
    expect(resolveAppState(trainee('in_progress'), waiting('2026-01-01'))).toBe('onboarding');
    // Self-guided is a normal state → Home.
    expect(resolveAppState(trainee('completed'), none)).toBe('home');
    // Joined in the first run → the waiting screen; joined after onboarding → Home (a waiting card).
    expect(resolveAppState(trainee('completed'), waiting('2026-01-01'))).toBe('waiting');
    expect(resolveAppState(trainee('completed'), waiting('2026-02-01'))).toBe('home');
    expect(resolveAppState(trainee('completed'), { ...waiting('2026-01-01'), hasPlan: true })).toBe('home');
    expect(resolveAppState({ roles: ['coach'], onboardingStatus: 'not_started' }, none)).toBe('coach');
    expect(resolveAppState({ roles: ['admin', 'coach'], onboardingStatus: 'not_started' }, none)).toBe('coach');
    expect(resolveAppState({ roles: ['admin'], onboardingStatus: 'not_started' }, none)).toBe('admin');
    // Coach + trainee: coach by default, the trainee side once she switched; a side her roles lack is ignored.
    const both = { roles: ['admin', 'coach', 'trainee'] as UserRole[], onboardingStatus: 'completed' as const };
    expect(resolveAppState(both, none)).toBe('coach');
    expect(resolveAppState({ ...both, preferences: { appMode: 'trainee' } }, none)).toBe('home');
    expect(resolveAppState({ roles: ['trainee'], onboardingStatus: 'completed', preferences: { appMode: 'coach' } }, none)).toBe('home');
    expect(resolveAppState({ roles: ['coach'], onboardingStatus: 'completed', preferences: { appMode: 'trainee' } }, none)).toBe('coach');
  });

  describe('requireRole', () => {
    it('returns 401 without an authenticated user', async () => {
      const { res, next } = await runRequireRole(undefined);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the user no longer exists', async () => {
      const { res, next } = await runRequireRole('64b000000000000000000000');
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 for a trainee on a coach route', async () => {
      await registerViaController({ name: 'T', email: 't@example.com', password: PASSWORD });
      const trainee = await User.findOne({ email: 't@example.com' });

      const { res, next } = await runRequireRole(String(trainee!._id));
      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('lets a coach through', async () => {
      await registerViaController({ name: 'C', email: 'c@example.com', password: PASSWORD });
      const coach = await User.findOneAndUpdate({ email: 'c@example.com' }, { roles: ['coach'] }, { new: true });
      await ensureCoachSetup(coach!._id, 'C');

      const { next } = await runRequireRole(String(coach!._id));
      expect(next).toHaveBeenCalledOnce();
    });

    it('a suspended coach gets 403 on every coach route', async () => {
      await registerViaController({ name: 'S', email: 's@example.com', password: PASSWORD });
      const coach = await User.findOneAndUpdate({ email: 's@example.com' }, { roles: ['coach'] }, { new: true });
      await ensureCoachSetup(coach!._id, 'S');
      await CoachProfile.updateOne({ userId: coach!._id }, { status: 'suspended' });

      const { res, next } = await runRequireRole(String(coach!._id));
      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('promote:coach database guard', () => {
  it('treats localhost as local', () => {
    expect(describeDatabaseUrl('mongodb://localhost:27017/sistem')).toEqual({
      hosts: ['localhost'],
      databaseName: 'sistem',
      isLocal: true,
    });
  });

  it('treats Atlas / remote hosts as non-local and never exposes credentials', () => {
    const target = describeDatabaseUrl('mongodb+srv://user:secret@cluster0.example.mongodb.net/sistem?retryWrites=true');
    expect(target.isLocal).toBe(false);
    expect(target.hosts).toEqual(['cluster0.example.mongodb.net']);
    expect(target.databaseName).toBe('sistem');
    expect(JSON.stringify(target)).not.toContain('secret');
  });
});
