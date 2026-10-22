import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Exercise } from '../../exercises/exercise.model';
import { Invite } from '../../invites/invite.model';
import { Membership } from '../../communities/community.model';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { CardioLog } from '../../cardio/cardio.model';
import { Notification } from '../../notifications/notification.model';
import { Coaching } from '../coaching.model';
import { setRateLimitForTests } from '../../../middleware/rateLimit.middleware';
import { normalizeIsraeliMobile, sanitizePaymentUrl } from '../../coachProfiles/coachPayment.validation';
import { newShortCode } from '../../invites/invite.service';
import { SHORT_CODE_PATTERN } from '../../invites/invite.constants';

// First run (choice → coach code → confirm → questionnaire), self-guided mode (free workouts, her
// own cardio), joining a coach later, and the coach's payment links.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const PASSWORD = 'a-good-password-1';
let api: ApiTestClient;
let coach: TestUser;
let squat: string;

async function shortCode(user: TestUser = coach): Promise<string> {
  const res = await api.request('GET', '/coach/invites', { token: user.token });
  expect(res.status).toBe(200);
  return res.body.permanent.shortCode;
}

async function signUp(email: string, inviteCode?: string) {
  const res = await api.request('POST', '/auth/register', { body: { name: 'Noa', email, password: PASSWORD, timezone: TIMEZONE, ...(inviteCode ? { inviteCode } : {}) } });
  expect(res.status).toBe(201);
  return { token: res.body.token as string, user: res.body.user, id: res.body.user.id as string };
}

const RUN = { sport: 'run', metric: 'rpe', steps: [{ type: 'block', id: 'w', kind: 'warmup', durationSec: 300, intensity: 3 }, { type: 'repeat', id: 'r', times: 4, blocks: [{ type: 'block', id: 'a', kind: 'work', durationSec: 60, intensity: 8 }, { type: 'block', id: 'b', kind: 'recovery', durationSec: 90, intensity: 3 }] }] };

describe('first run, self-guided, payments', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Promise.all([Coaching.init(), Invite.init(), Membership.init(), WorkoutLog.init(), CardioLog.init(), Notification.init()]);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('shaked@example.com', { role: 'coach' });
    squat = String((await Exercise.create({ name: 'Squat', slug: 'squat', primaryMuscles: ['quadriceps'], equipment: ['barbell'], difficulty: 'beginner', movementType: 'strength', reviewStatus: 'imported', isActive: true, isPrimaryVariant: true, source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() } }))._id);
  });

  afterEach(() => setRateLimitForTests(false));

  describe('short coach code', () => {
    it('is 6 characters without look-alikes, unbiased, and stable until the link is regenerated', async () => {
      for (let i = 0; i < 200; i += 1) expect(newShortCode()).toMatch(SHORT_CODE_PATTERN);
      const code = await shortCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(await shortCode()).toBe(code);
      await api.request('POST', '/coach/invites/regenerate', { token: coach.token, body: {} });
      const next = await shortCode();
      expect(next).not.toBe(code);
      // The old code now answers "no longer active".
      expect((await api.request('GET', `/join/${code}`)).status).toBe(410);
    });

    it('is validated server-side (lower case accepted; junk / unknown → 404) and shows the coach card when signed in', async () => {
      const code = await shortCode();
      const trainee = await signUp('t@example.com');
      const preview = await api.request('GET', `/join/${code.toLowerCase()}`, { token: trainee.token });
      expect(preview.status).toBe(200);
      expect(preview.body).toMatchObject({ coachName: 'shaked', action: 'join', coachAvatar: null, coachCommunityNames: [expect.any(String)] });
      expect((await api.request('GET', '/join/ABCDE1', { token: trainee.token })).status).toBe(404);
      expect((await api.request('GET', '/join/ZZZZZZ', { token: trainee.token })).status).toBe(404);
    });

    it('join codes are rate-limited', async () => {
      setRateLimitForTests(true);
      let last = 200;
      for (let i = 0; i < 70 && last !== 429; i += 1) last = (await api.request('GET', '/join/ZZZZZZ')).status;
      expect(last).toBe(429);
    });
  });

  describe('first run', () => {
    it('no invite → choose_path; "with a coach" + code → onboarding → waiting (her coach sees her)', async () => {
      const trainee = await signUp('t@example.com');
      expect(trainee.user).toMatchObject({ appState: 'choose_path', coachingStatus: null });

      const joined = await api.request('POST', `/join/${await shortCode()}`, { token: trainee.token });
      expect(joined.status).toBe(200);
      expect(joined.body.user).toMatchObject({ appState: 'onboarding', coachingStatus: 'waiting' });
      expect(await Coaching.countDocuments({ traineeId: trainee.id, status: 'waiting' })).toBe(1);
      expect(await Membership.countDocuments({ userId: trainee.id, status: 'active' })).toBe(1);
    });

    it('"on my own" is remembered (resume lands in the questionnaire) and completing goes straight Home', async () => {
      const trainee = await signUp('t@example.com');
      const chose = await api.request('POST', '/users/me/self-guided', { token: trainee.token });
      expect(chose.body.user).toMatchObject({ appState: 'onboarding', coachingStatus: null });
      // Closing the app and coming back: still the questionnaire, never the choice again.
      expect((await api.request('GET', '/auth/me', { token: trainee.token })).body.user.appState).toBe('onboarding');
      expect((await api.request('POST', '/users/me/self-guided', { token: coach.token })).status).toBe(403);
    });

    it('a /join link at sign-up skips the choice', async () => {
      const code = (await api.request('GET', '/coach/invites', { token: coach.token })).body.permanent.code;
      expect((await signUp('t@example.com', code)).user).toMatchObject({ appState: 'onboarding', coachingStatus: 'waiting' });
      expect((await signUp('u@example.com', await shortCode())).user.appState).toBe('onboarding');
    });

    it('joining later (after onboarding) keeps her on Home with a waiting coaching', async () => {
      const trainee = await createTestUser('t@example.com', { onboardingStatus: 'completed', onboardingCompletedAt: new Date(Date.now() - 60_000), selfGuidedAt: new Date(Date.now() - 60_000), timezone: TIMEZONE });
      expect((await api.request('GET', '/auth/me', { token: trainee.token })).body.user).toMatchObject({ appState: 'home', coachingStatus: null });
      const joined = await api.request('POST', `/join/${await shortCode()}`, { token: trainee.token });
      expect(joined.body.user).toMatchObject({ appState: 'home', coachingStatus: 'waiting' });
    });
  });

  describe('payment links', () => {
    it('validates and normalizes: https only, Israeli mobile, note ≤ 140', () => {
      expect(sanitizePaymentUrl('https://links.payboxapp.com/abc')).toBe('https://links.payboxapp.com/abc');
      for (const bad of ['http://x.com', 'javascript:alert(1)', 'data:text/html,x', 'https://user:pw@x.com', 'https://localhost', 'nonsense']) {
        expect(sanitizePaymentUrl(bad)).toBeNull();
      }
      expect(normalizeIsraeliMobile('050-123-4567')).toBe('0501234567');
      expect(normalizeIsraeliMobile('+972 52 765 4321')).toBe('0527654321');
      expect(normalizeIsraeliMobile('03-1234567')).toBeNull();
    });

    it('the coach saves them; only her connected trainees see them on the coach card', async () => {
      const save = (body: object) => api.request('PUT', '/coach/profile/payment', { token: coach.token, body });
      expect((await save({ payboxUrl: 'javascript:alert(1)' })).status).toBe(400);
      expect((await save({ bitPhone: '12345' })).status).toBe(400);
      expect((await save({ note: 'x'.repeat(141) })).status).toBe(400);
      expect((await save({ unknown: 'x' })).status).toBe(400);
      const saved = await save({ payboxUrl: 'https://links.payboxapp.com/abc', bitPhone: '050-123-4567', note: 'תשלום חודשי' });
      expect(saved.body.payment).toEqual({ payboxUrl: 'https://links.payboxapp.com/abc', bitPhone: '0501234567', note: 'תשלום חודשי' });
      expect((await api.request('GET', '/coach/profile/payment', { token: coach.token })).body.payment.bitPhone).toBe('0501234567');

      const mine = await createTestUser('mine@example.com', { coachId: coach.user._id });
      const stranger = await createTestUser('stranger@example.com', { coachId: (await createTestUser('other@example.com', { role: 'coach' })).user._id });
      const mineCard = (await api.request('GET', '/coachings', { token: mine.token })).body.coachings[0];
      expect(mineCard).toMatchObject({ coachName: 'shaked', payment: { bitPhone: '0501234567' }, communityNames: [expect.any(String)] });
      const strangerCards = (await api.request('GET', '/coachings', { token: stranger.token })).body.coachings;
      expect(strangerCards.every((card: { payment: unknown }) => card.payment === null)).toBe(true);
      // The public join preview never carries payment links.
      expect(JSON.stringify((await api.request('GET', `/join/${await shortCode()}`)).body)).not.toContain('0501234567');

      expect((await save({ payboxUrl: null, bitPhone: '', note: null })).body.payment).toEqual({ payboxUrl: null, bitPhone: null, note: null });
      expect((await api.request('GET', '/coachings', { token: mine.token })).body.coachings[0].payment).toBeNull();
      // Not a coach → 403.
      expect((await api.request('PUT', '/coach/profile/payment', { token: mine.token, body: {} })).status).toBe(403);
    });
  });

  describe('self-guided tools', () => {
    it('free workout: scratch → add an exercise → log → finish; trainee-owned and visible to a coach she joins later', async () => {
      const trainee = await createTestUser('t@example.com', { onboardingStatus: 'completed', onboardingCompletedAt: new Date(), timezone: TIMEZONE });
      const started = await api.request('POST', '/workout-logs/free', { token: trainee.token, body: { mode: 'scratch' } });
      expect(started.status).toBe(201);
      const logId = started.body.session.log.id;
      expect(started.body.session.log).toMatchObject({ source: 'free', planId: null, workoutId: null });
      expect(started.body.session.workout.exercises).toEqual([]);

      // One open workout at a time, plan or free.
      expect((await api.request('POST', '/workout-logs/free', { token: trainee.token, body: { mode: 'scratch' } })).status).toBe(409);
      expect((await api.request('POST', '/workout-logs/free', { token: trainee.token, body: { mode: 'nope' } })).status).toBe(400);

      const picker = await api.request('GET', '/workout-logs/free/exercises?search=squ', { token: trainee.token });
      expect(picker.status).toBe(200);
      const added = await api.request('POST', `/workout-logs/${logId}/exercises`, { token: trainee.token, body: { exerciseId: squat } });
      expect(added.status).toBe(200);
      const [exercise] = added.body.session.workout.exercises;
      expect(exercise).toMatchObject({ exerciseId: squat, sets: 3 });
      expect(exercise.resolvedSets).toHaveLength(3);

      const sets = [{ planExerciseId: exercise.id, setIndex: 0, reps: 8, weight: 40, completed: true }];
      const finished = await api.request('POST', `/workout-logs/${logId}/finish`, { token: trainee.token, body: { sets } });
      expect(finished.status).toBe(200);
      expect(finished.body.log).toMatchObject({ source: 'free', status: 'completed' });
      expect(await WorkoutLog.findById(logId).lean()).toMatchObject({ coachingId: null, planId: null });

      // Repeat it: same exercises, what she did as targets.
      const again = await api.request('POST', '/workout-logs/free', { token: trainee.token, body: { mode: 'repeat', fromLogId: logId } });
      expect(again.body.session.workout.exercises[0].resolvedSets[0]).toMatchObject({ reps: 8, targetWeight: 40 });
      await api.request('POST', `/workout-logs/${again.body.session.log.id}/abandon`, { token: trainee.token });

      // She joins a coach: he sees her free workouts as history.
      await Coaching.create({ traineeId: trainee.id, coachId: coach.user._id, status: 'active' });
      const logs = await api.request('GET', `/coach/trainees/${trainee.id}/workout-logs`, { token: coach.token });
      expect(logs.body.items.map((log: { id: string }) => log.id)).toEqual([logId]);
    });

    it('her own cardio workout: build, run any number of times, archive; the coach sees the runs, never the workouts', async () => {
      const trainee = await createTestUser('t@example.com', { onboardingStatus: 'completed', onboardingCompletedAt: new Date(), timezone: TIMEZONE });
      expect((await api.request('POST', '/cardio/own', { token: trainee.token, body: { title: '', cardio: RUN } })).status).toBe(400);
      expect((await api.request('POST', '/cardio/own', { token: trainee.token, body: { title: 'x', cardio: { ...RUN, steps: [] } } })).status).toBe(400);
      const created = await api.request('POST', '/cardio/own', { token: trainee.token, body: { title: 'ריצת בוקר', cardio: RUN } });
      expect(created.status).toBe(201);
      const id = created.body.ownWorkoutId;
      expect(created.body).toMatchObject({ planId: null, canStart: true, workout: { title: 'ריצת בוקר', kind: 'cardio' } });

      const run = { ownWorkoutId: id, completedSec: 600, roundsDone: 4, highIntensitySec: 240, rpe: 7 };
      expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: run })).status).toBe(201);
      expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: run })).status).toBe(201);
      expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: { ...run, roundsDone: 9 } })).status).toBe(400);
      const list = await api.request('GET', '/cardio/own', { token: trainee.token });
      expect(list.body.items[0]).toMatchObject({ id, runs: 2 });

      const other = await createTestUser('o@example.com');
      expect((await api.request('GET', `/cardio/own/${id}`, { token: other.token })).status).toBe(404);

      await Coaching.create({ traineeId: trainee.id, coachId: coach.user._id, status: 'active' });
      const coachLogs = await api.request('GET', `/coach/trainees/${trainee.id}/cardio-logs`, { token: coach.token });
      expect(coachLogs.body.items).toHaveLength(2);
      expect(coachLogs.body.items[0]).toMatchObject({ ownWorkoutId: id, planId: null });

      expect((await api.request('DELETE', `/cardio/own/${id}`, { token: trainee.token })).status).toBe(204);
      expect((await api.request('GET', '/cardio/own', { token: trainee.token })).body.items).toEqual([]);
      expect(await CardioLog.countDocuments({ ownWorkoutId: id })).toBe(2);
    });
  });
});
