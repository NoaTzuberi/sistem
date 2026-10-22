import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Exercise } from '../../exercises/exercise.model';
import { Plan } from '../../plans/plan.model';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { BodyMetric } from '../../bodyMetrics/bodyMetric.model';
import { Notification } from '../../notifications/notification.model';
import { User } from '../../users/user.model';
import { Invite } from '../../invites/invite.model';
import { Membership } from '../../communities/community.model';
import { currentWeekStart } from '../../plans/planWeek';
import { Coaching } from '../coaching.model';
import { setMultiCoachForTests } from '../coaching.config';
import { migrateAccounts } from '../accountsMigration';
import { setRateLimitForTests } from '../../../middleware/rateLimit.middleware';

// Accounts & relationships: admin → coach → trainee, invites, communities, and the authorization
// rules (coach-owned data per coaching; trainee-owned data for every live coaching; communities never
// grant private access).

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const PASSWORD = 'a-good-password-1';
let api: ApiTestClient;
let admin: TestUser;
let coachA: TestUser;
let coachB: TestUser;
let squat: string;

const onboarded = () => ({ onboardingStatus: 'completed' as const, onboardingCompletedAt: new Date(), timezone: TIMEZONE });

async function permanentCode(coach: TestUser): Promise<string> {
  const res = await api.request('GET', '/coach/invites', { token: coach.token });
  expect(res.status).toBe(200);
  return res.body.permanent.code;
}

/** A draft with one workout, published through the API (the real publish path). */
async function publishPlan(coach: TestUser, traineeId: string): Promise<string> {
  const path = `/coach/trainees/${traineeId}/plans`;
  const draft = await api.request('POST', path, { token: coach.token, body: { weekStartDate: currentWeekStart(TIMEZONE) } });
  expect(draft.status).toBe(201);
  const workouts = [{ title: 'Lower body', dayOfWeek: 0, exercises: [{ exerciseId: squat, sets: 3, reps: 8 }] }];
  expect((await api.request('PUT', `${path}/${draft.body.plan.id}`, { token: coach.token, body: { workouts } })).status).toBe(200);
  const published = await api.request('POST', `${path}/${draft.body.plan.id}/publish`, { token: coach.token });
  expect(published.status).toBe(200);
  return draft.body.plan.id;
}

async function appStateOf(user: TestUser): Promise<string> {
  return (await api.request('GET', '/auth/me', { token: user.token })).body.user.appState;
}

async function waitForNotification(userId: string, type: 'trainee_onboarded') {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const [found] = await Notification.find({ userId, type }).lean();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return null;
}

describe('accounts & relationships', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Promise.all([Plan.init(), Coaching.init(), Invite.init(), Membership.init(), Notification.init()]);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    admin = await createTestUser('noa@example.com', { role: 'admin' });
    coachA = await createTestUser('coach-a@example.com', { role: 'coach' });
    coachB = await createTestUser('coach-b@example.com', { role: 'coach' });
    squat = String(
      (
        await Exercise.create({
          slug: 'barbell-squat',
          name: 'Barbell Squat',
          primaryMuscles: ['quadriceps'],
          equipment: ['barbell'],
          difficulty: 'beginner',
          movementType: 'strength',
          source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() },
        })
      )._id,
    );
  });

  afterEach(() => {
    setMultiCoachForTests(null);
    setRateLimitForTests(false);
  });

  describe('admin', () => {
    it('creates a coach → one-time set-password link → she logs in as a coach', async () => {
      const created = await api.request('POST', '/admin/coaches', { token: admin.token, body: { name: 'Dana', email: 'Dana@Example.com' } });
      expect(created.status).toBe(201);
      expect(created.body.coach).toMatchObject({ name: 'Dana', email: 'dana@example.com', status: 'active', passwordSet: false });
      expect(created.body.emailSent).toBe(false); // no Resend key in tests: the admin copies the link
      const token = new URL(created.body.setPasswordUrl).searchParams.get('token')!;

      // No password yet: login looks like a wrong password.
      expect((await api.request('POST', '/auth/login', { body: { email: 'dana@example.com', password: PASSWORD } })).status).toBe(401);

      const set = await api.request('POST', '/auth/set-password', { body: { token, password: PASSWORD } });
      expect(set.status).toBe(200);
      expect(set.body.user).toMatchObject({ roles: ['coach'], appState: 'coach' });
      // Single use.
      expect((await api.request('POST', '/auth/set-password', { body: { token, password: PASSWORD } })).status).toBe(400);

      const login = await api.request('POST', '/auth/login', { body: { email: 'dana@example.com', password: PASSWORD } });
      expect(login.status).toBe(200);
      expect((await api.request('GET', '/coach/invites', { token: login.body.token })).status).toBe(200);

      const list = await api.request('GET', '/admin/coaches', { token: admin.token });
      expect(list.body.coaches.find((c: { email: string }) => c.email === 'dana@example.com')).toMatchObject({ passwordSet: true });
    });

    it('only an admin manages coaches; an existing email is refused', async () => {
      expect((await api.request('GET', '/admin/coaches', { token: coachA.token })).status).toBe(403);
      expect((await api.request('POST', '/admin/coaches', { body: { name: 'X', email: 'x@example.com' } })).status).toBe(401);
      const taken = await api.request('POST', '/admin/coaches', { token: admin.token, body: { name: 'A', email: 'coach-a@example.com' } });
      expect(taken.status).toBe(409);
    });

    it('public sign-up never creates a coach and never links one by itself', async () => {
      const res = await api.request('POST', '/auth/register', { body: { name: 'S', email: 's@example.com', password: PASSWORD, role: 'coach', roles: ['admin'] } });
      expect(res.status).toBe(201);
      expect(res.body.user.roles).toEqual(['trainee']);
      expect(await Coaching.countDocuments({ traineeId: res.body.user.id })).toBe(0);
    });

    it('suspending a coach closes her routes and her links; reactivating restores both', async () => {
      const code = await permanentCode(coachA);
      const coachId = (await api.request('GET', '/admin/coaches', { token: admin.token })).body.coaches.find(
        (c: { email: string }) => c.email === 'coach-a@example.com',
      ).id;

      expect((await api.request('PATCH', `/admin/coaches/${coachId}`, { token: admin.token, body: { status: 'suspended' } })).status).toBe(200);
      const blocked = await api.request('GET', '/coach/trainees', { token: coachA.token });
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('coach_suspended');
      expect((await api.request('GET', `/join/${code}`)).status).toBe(410);

      await api.request('PATCH', `/admin/coaches/${coachId}`, { token: admin.token, body: { status: 'active' } });
      expect((await api.request('GET', '/coach/trainees', { token: coachA.token })).status).toBe(200);
      expect((await api.request('GET', `/join/${code}`)).status).toBe(200);
    });
  });

  describe('invites & join', () => {
    it('new trainee: link → sign-up → onboarding → waiting → the coach publishes → active / home', async () => {
      const code = await permanentCode(coachA);
      const preview = await api.request('GET', `/join/${code}`);
      expect(preview.body).toMatchObject({ type: 'coaching', coachName: 'coach-a', action: 'sign_up' });

      const signUp = await api.request('POST', '/auth/register', { body: { name: 'Maya', email: 'maya@example.com', password: PASSWORD, inviteCode: code } });
      expect(signUp.status).toBe(201);
      const maya = { id: signUp.body.user.id, token: signUp.body.token } as TestUser;
      expect(signUp.body.user.appState).toBe('onboarding'); // never skipped for invited trainees
      const coaching = await Coaching.findOne({ traineeId: maya.id, coachId: coachA.id }).lean();
      expect(coaching?.status).toBe('waiting');
      expect((await api.request('GET', '/communities/mine', { token: maya.token })).body.communities).toHaveLength(1);

      // She shows up in the coach's list as soon as she joined.
      const list = await api.request('GET', '/coach/trainees', { token: coachA.token });
      expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([maya.id]);

      await User.updateOne({ _id: maya.id }, onboarded());
      expect(await appStateOf(maya)).toBe('waiting');
      expect((await api.request('GET', '/coach/trainees', { token: coachA.token })).body.items[0]).toMatchObject({ status: 'waiting', coachingStatus: 'waiting' });

      await publishPlan(coachA, maya.id);
      expect((await Coaching.findById(coaching!._id).lean())?.status).toBe('active');
      expect(await appStateOf(maya)).toBe('home');
    });

    it('an existing trainee without a coach joins (no new onboarding) and the coach is told', async () => {
      const trainee = await createTestUser('t@example.com', onboarded());
      expect(await appStateOf(trainee)).toBe('home');
      const code = await permanentCode(coachA);

      expect((await api.request('GET', `/join/${code}`, { token: trainee.token })).body.action).toBe('join');
      // A pasted link works as well as a bare code.
      const joined = await api.request('POST', `/join/${encodeURIComponent(code)}`, { token: trainee.token });
      expect(joined.status).toBe(200);
      expect(joined.body).toMatchObject({ result: 'coaching_started', coachName: 'coach-a' });
      // Joined after onboarding: Home with a waiting card (her own tools keep working), not the waiting screen.
      expect(joined.body.user).toMatchObject({ appState: 'home', coachingStatus: 'waiting' });
      expect(await waitForNotification(coachA.id, 'trainee_onboarded')).not.toBeNull();

      // Again: nothing new.
      expect((await api.request('POST', `/join/${code}`, { token: trainee.token })).body.result).toBe('already_hers');
      expect(await Coaching.countDocuments({ traineeId: trainee.id })).toBe(1);
    });

    it('with another coach and multi-coach off: explained, never switched; a community link still works', async () => {
      const trainee = await createTestUser('t@example.com', { coachId: coachA.user._id, ...onboarded() });
      const codeB = await permanentCode(coachB);

      const preview = await api.request('GET', `/join/${codeB}`, { token: trainee.token });
      expect(preview.body).toMatchObject({ action: 'other_coach', otherCoachName: 'coach-a' });
      const refused = await api.request('POST', `/join/${codeB}`, { token: trainee.token });
      expect(refused.status).toBe(409);
      expect(refused.body.otherCoachName).toBe('coach-a');
      expect(await Coaching.countDocuments({ traineeId: trainee.id, live: true })).toBe(1);

      const community = (await api.request('GET', '/coach/invites/community', { token: coachB.token })).body.invite.code;
      const joined = await api.request('POST', `/join/${community}`, { token: trainee.token });
      expect(joined.body.result).toBe('community_joined');
      expect((await api.request('GET', '/communities/mine', { token: trainee.token })).body.communities).toHaveLength(2);
      // Membership never grants private access.
      expect((await api.request('GET', `/coach/trainees/${trainee.id}`, { token: coachB.token })).status).toBe(404);
      expect((await api.request('GET', `/coach/trainees/${trainee.id}/body-metrics`, { token: coachB.token })).status).toBe(404);
      expect((await api.request('GET', '/coach/trainees', { token: coachB.token })).body.items).toEqual([]);
    });

    it('with multi-coach on, a second coaching is added', async () => {
      setMultiCoachForTests(true);
      const trainee = await createTestUser('t@example.com', { coachId: coachA.user._id, ...onboarded() });
      const res = await api.request('POST', `/join/${await permanentCode(coachB)}`, { token: trainee.token });
      expect(res.body.result).toBe('coaching_started');
      expect(await Coaching.countDocuments({ traineeId: trainee.id, live: true })).toBe(2);
    });

    it('invalid / expired / revoked / used / other-email codes get a clear answer', async () => {
      const trainee = await createTestUser('t@example.com', onboarded());
      expect((await api.request('GET', '/join/not-a-real-code-at-all')).body).toMatchObject({ code: 'invite_invalid', problem: 'invalid' });

      const personal = await api.request('POST', '/coach/invites', { token: coachA.token, body: { targetEmail: 'T@example.com' } });
      expect(personal.status).toBe(201);
      expect(personal.body.invite).toMatchObject({ maxUses: 1, uses: 0, targetEmail: 't@example.com' });
      const other = await createTestUser('other@example.com', onboarded());
      expect((await api.request('POST', `/join/${personal.body.invite.code}`, { token: other.token })).status).toBe(403);
      expect((await api.request('POST', `/join/${personal.body.invite.code}`, { token: trainee.token })).status).toBe(200);
      expect((await api.request('GET', `/join/${personal.body.invite.code}`)).body.problem).toBe('used_up');

      const old = await permanentCode(coachA);
      const fresh = await api.request('POST', '/coach/invites/regenerate', { token: coachA.token, body: {} });
      expect(fresh.body.invite.code).not.toBe(old);
      expect((await api.request('GET', `/join/${old}`)).body.problem).toBe('revoked');

      const expiring = await api.request('POST', '/coach/invites', { token: coachA.token, body: {} });
      await Invite.updateOne({ code: expiring.body.invite.code }, { expiresAt: new Date(Date.now() - 1000) });
      expect((await api.request('GET', `/join/${expiring.body.invite.code}`)).status).toBe(410);

      // A coach can only revoke her own links.
      const mine = await api.request('POST', '/coach/invites', { token: coachA.token, body: {} });
      expect((await api.request('DELETE', `/coach/invites/${mine.body.invite.id}`, { token: coachB.token })).status).toBe(404);
      expect((await api.request('DELETE', `/coach/invites/${mine.body.invite.id}`, { token: coachA.token })).status).toBe(204);
      expect((await api.request('GET', `/join/${mine.body.invite.code}`)).body.problem).toBe('revoked');
    });

    it('a sign-up with an unusable code still makes the account (no dead end) and says why', async () => {
      const res = await api.request('POST', '/auth/register', {
        body: { name: 'N', email: 'n@example.com', password: PASSWORD, inviteCode: 'not-a-real-code-at-all' },
      });
      expect(res.status).toBe(201);
      expect(res.body.inviteError.code).toBe('invite_invalid');
    });

    it('rate-limits the auth and join endpoints', async () => {
      setRateLimitForTests(true);
      let last = 0;
      for (let attempt = 0; attempt < 21; attempt += 1) {
        last = (await api.request('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'wrong-password' } })).status;
      }
      expect(last).toBe(429);
    });
  });

  describe('authorization across coaches (multi-coach on)', () => {
    it('each coach sees only her own plans and logs; both see the trainee-owned data', async () => {
      setMultiCoachForTests(true);
      const trainee = await createTestUser('t@example.com', { coachId: coachA.user._id, ...onboarded() });
      await api.request('POST', `/join/${await permanentCode(coachB)}`, { token: trainee.token });

      const planA = await publishPlan(coachA, trainee.id);
      const planB = await publishPlan(coachB, trainee.id); // same week: one plan per coaching
      const plansA = await api.request('GET', `/coach/trainees/${trainee.id}/plans`, { token: coachA.token });
      expect(plansA.body.items.map((plan: { id: string }) => plan.id)).toEqual([planA]);
      expect((await api.request('GET', `/coach/trainees/${trainee.id}/plans/${planB}`, { token: coachA.token })).status).toBe(404);
      expect((await api.request('PUT', `/coach/trainees/${trainee.id}/plans/${planB}`, { token: coachA.token, body: { workouts: [] } })).status).toBe(404);

      const plan = await Plan.findById(planA).lean();
      await WorkoutLog.create({
        traineeId: trainee.user._id,
        planId: planA,
        workoutId: plan!.workouts[0]._id,
        workoutTitle: 'Lower body',
        status: 'completed',
        finishedAt: new Date(),
      });
      expect((await api.request('GET', `/coach/trainees/${trainee.id}/workout-logs`, { token: coachA.token })).body.items).toHaveLength(1);
      expect((await api.request('GET', `/coach/trainees/${trainee.id}/workout-logs`, { token: coachB.token })).body.items).toHaveLength(0);

      await BodyMetric.create({ traineeId: trainee.user._id, date: '2026-10-01', weight: 60 });
      for (const coach of [coachA, coachB]) {
        const body = await api.request('GET', `/coach/trainees/${trainee.id}/body-metrics`, { token: coach.token });
        expect(body.status).toBe(200);
        const detail = await api.request('GET', `/coach/trainees/${trainee.id}`, { token: coach.token });
        expect(detail.status).toBe(200);
      }

      // Her app is coaching-aware: one coaching at a time, never someone else's.
      const coachings = (await api.request('GET', '/coachings', { token: trainee.token })).body.coachings;
      expect(coachings).toHaveLength(2);
      const forB = coachings.find((c: { coachId: string }) => c.coachId === coachB.id).id;
      expect((await api.request('GET', `/plans/week?coachingId=${forB}`, { token: trainee.token })).body.plan.id).toBe(planB);
      const stranger = await createTestUser('x@example.com', { coachId: coachA.user._id });
      expect((await api.request('GET', `/plans/week?coachingId=${forB}`, { token: stranger.token })).status).toBe(404);
    });

    it('an ended coaching closes the coach out but keeps the history', async () => {
      const trainee = await createTestUser('t@example.com', { coachId: coachA.user._id, ...onboarded() });
      const planA = await publishPlan(coachA, trainee.id);
      await Coaching.updateMany({ traineeId: trainee.id }, { $set: { status: 'ended', live: false, endedAt: new Date() } });

      expect((await api.request('GET', `/coach/trainees/${trainee.id}/plans`, { token: coachA.token })).status).toBe(404);
      expect(await Plan.exists({ _id: planA })).not.toBeNull();
      expect(await appStateOf(trainee)).toBe('home');
    });
  });

  describe('migration', () => {
    it('moves role → roles and coachId → a coaching, links old records, and is idempotent', async () => {
      const db = mongoose.connection.db!;
      const coachId = new mongoose.Types.ObjectId();
      const traineeId = new mongoose.Types.ObjectId();
      await db.collection('users').insertMany([
        { _id: coachId, name: 'Old Coach', email: 'old-coach@example.com', passwordHash: 'x', role: 'coach', onboardingStatus: 'not_started', timezone: TIMEZONE },
        { _id: traineeId, name: 'Old T', email: 'old-t@example.com', passwordHash: 'x', role: 'trainee', coachId, onboardingStatus: 'completed', timezone: TIMEZONE, createdAt: new Date() },
      ]);
      const planId = new mongoose.Types.ObjectId();
      await db.collection('plans').insertOne({ _id: planId, traineeId, coachId, weekStartDate: '2026-10-04', status: 'published', workouts: [] });
      await db.collection('workoutlogs').insertOne({ traineeId, planId, workoutId: new mongoose.Types.ObjectId(), workoutTitle: 'W', status: 'completed', sets: [] });

      const first = await migrateAccounts();
      expect(first).toMatchObject({ roles: 2, coachings: 1 });
      const coaching = await Coaching.findOne({ traineeId }).lean();
      expect(coaching).toMatchObject({ status: 'active', live: true });
      const user = await db.collection('users').findOne({ _id: traineeId });
      expect(user).toMatchObject({ roles: ['trainee'] });
      expect(user).not.toHaveProperty('coachId');
      expect((await db.collection('plans').findOne({ _id: planId }))?.coachingId).toEqual(coaching!._id);
      expect((await db.collection('workoutlogs').findOne({ planId }))?.coachingId).toEqual(coaching!._id);
      expect(await db.collection('coachprofiles').countDocuments({ userId: coachId })).toBe(1);

      const second = await migrateAccounts();
      expect(second).toMatchObject({ roles: 0, coaches: 0, coachings: 0, records: 0 });
    });
  });
});
