import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Exercise } from '../../exercises/exercise.model';
import type { Equipment } from '../../exercises/exercise.constants';
import { Notification } from '../../notifications/notification.model';
import { Plan } from '../../plans/plan.model';
import { addDays, currentWeekStart } from '../../plans/planWeek';
import { WorkoutLog } from '../workoutLog.model';

// Phase 8: the active workout session — start / resume, per-set saves, finish,
// discard, ownership, and the "workout completed" notification to the coach.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const THIS_WEEK = currentWeekStart(TIMEZONE);

let api: ApiTestClient;
let coach: TestUser;
let trainee: TestUser;
let other: TestUser;
let squatId: string;
let plankId: string;

async function createExercise(slug: string, name: string, equipment: Equipment) {
  const exercise = await Exercise.create({
    slug,
    name,
    primaryMuscles: ['quadriceps'],
    equipment: [equipment],
    difficulty: 'beginner',
    movementType: 'strength',
    source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() },
  });
  return String(exercise._id);
}

async function createPlan(traineeUser: TestUser, weekStartDate = THIS_WEEK) {
  return Plan.create({
    traineeId: traineeUser.user._id,
    coachId: coach.user._id,
    weekStartDate,
    status: 'published',
    publishedAt: new Date(),
    workouts: [
      {
        title: 'Lower Body',
        order: 0,
        exercises: [
          // A rep range with no target weight: pre-filled from the low end and last time.
          { exerciseId: squatId, sets: 2, reps: 8, repsMax: 12, restSec: 90 },
          {
            exerciseId: plankId,
            sets: 2,
            setTargets: [
              { type: 'warmup', durationSec: 20 },
              { type: 'working', durationSec: 45, targetWeight: 5 },
            ],
          },
        ],
      },
      { title: 'Second', order: 1, exercises: [{ exerciseId: squatId, sets: 1, reps: 5, targetWeight: 60 }] },
    ],
  });
}

type CreatedPlan = Awaited<ReturnType<typeof createPlan>>;

function start(plan: CreatedPlan, index = 0, user = trainee) {
  return api.request('POST', '/workout-logs', {
    token: user.token,
    body: { planId: String(plan._id), workoutId: String(plan.workouts[index]._id) },
  });
}

function setUpdate(plan: CreatedPlan, exerciseIndex: number, setIndex: number, fields: Record<string, unknown>) {
  return { planExerciseId: String(plan.workouts[0].exercises[exerciseIndex]._id), setIndex, ...fields };
}

describe('workout session', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    trainee = await createTestUser('t@example.com', { coachId: coach.user._id, timezone: TIMEZONE });
    other = await createTestUser('o@example.com', { coachId: coach.user._id, timezone: TIMEZONE });
    squatId = await createExercise('squat', 'Squat', 'barbell');
    plankId = await createExercise('plank', 'Plank', 'bodyweight');
  });

  describe('start', () => {
    it('needs a token', async () => {
      expect((await api.request('POST', '/workout-logs', { body: {} })).status).toBe(401);
    });

    it('creates the log with sets pre-filled from resolvedSets', async () => {
      const plan = await createPlan(trainee);
      const res = await start(plan);
      expect(res.status).toBe(201);

      const { log, workout, lastPerformance, serverTime } = res.body.session;
      expect(log).toMatchObject({ status: 'in_progress', workoutTitle: 'Lower Body', planId: String(plan._id) });
      expect(serverTime).toEqual(expect.any(String));
      expect(workout.exercises[0].exercise.name).toBe('Squat');
      expect(lastPerformance).toEqual({});
      expect(log.sets).toHaveLength(4);
      // Rep range: the low end. No target weight and no history: no weight.
      expect(log.sets[0]).toMatchObject({ exerciseId: squatId, setIndex: 0, type: 'working', reps: 8, completed: false });
      expect(log.sets[0].weight).toBeUndefined();
      // Per-set targets keep their own type, duration and weight.
      expect(log.sets[2]).toMatchObject({ exerciseId: plankId, setIndex: 0, type: 'warmup', durationSec: 20 });
      expect(log.sets[3]).toMatchObject({ setIndex: 1, type: 'working', durationSec: 45, weight: 5 });
    });

    it('pre-fills the weight from last time when the coach set none, and returns "last time"', async () => {
      const plan = await createPlan(trainee);
      await WorkoutLog.create({
        traineeId: trainee.user._id,
        planId: plan._id,
        workoutId: plan.workouts[1]._id,
        workoutTitle: 'Second',
        status: 'completed',
        finishedAt: new Date(),
        sets: [
          { exerciseId: squatId, setIndex: 0, type: 'warmup', reps: 12, weight: 20, completed: true },
          { exerciseId: squatId, setIndex: 1, type: 'working', reps: 10, weight: 40, completed: true },
          { exerciseId: squatId, setIndex: 2, type: 'working', reps: 6, weight: 50, completed: false },
          { exerciseId: squatId, setIndex: 3, type: 'drop', reps: 15, weight: 30, completed: true },
        ],
      });

      const { session } = (await start(plan)).body;
      expect(session.log.sets[0].weight).toBe(40);
      expect(session.lastPerformance[squatId]).toMatchObject({ weight: 40, reps: 10 });
      expect(session.lastPerformance[plankId]).toBeUndefined();
    });

    it('resumes the same workout instead of starting a second one', async () => {
      const plan = await createPlan(trainee);
      const first = await start(plan);
      const again = await start(plan);
      expect(again.status).toBe(200);
      expect(again.body.session.log.id).toBe(first.body.session.log.id);
      expect(await WorkoutLog.countDocuments()).toBe(1);
    });

    it('refuses another workout while one is open, and says which', async () => {
      const plan = await createPlan(trainee);
      const first = await start(plan);
      const res = await start(plan, 1);
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        code: 'other_workout_active',
        activeLog: { logId: first.body.session.log.id, workoutTitle: 'Lower Body' },
      });
    });

    it("refuses next week's workouts and done ones", async () => {
      const nextWeek = await createPlan(trainee, addDays(THIS_WEEK, 7));
      expect((await start(nextWeek)).status).toBe(409);

      const plan = await createPlan(trainee);
      await WorkoutLog.create({
        traineeId: trainee.user._id,
        planId: plan._id,
        workoutId: plan.workouts[0]._id,
        workoutTitle: 'Lower Body',
        status: 'completed',
        finishedAt: new Date(),
      });
      expect((await start(plan)).status).toBe(409);
    });

    it("another trainee's plan, a draft or a bad body: not startable", async () => {
      const othersPlan = await createPlan(other);
      expect((await start(othersPlan)).status).toBe(404);

      const draft = await createPlan(trainee);
      await Plan.updateOne({ _id: draft._id }, { status: 'draft' });
      expect((await start(draft)).status).toBe(404);

      const bad = await api.request('POST', '/workout-logs', { token: trainee.token, body: { planId: 'x' } });
      expect(bad.status).toBe(400);
    });
  });

  describe('logging sets', () => {
    it('saves set changes and stamps completedAt on the server', async () => {
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;

      const res = await api.request('PATCH', `/workout-logs/${logId}/sets`, {
        token: trainee.token,
        body: { sets: [setUpdate(plan, 0, 0, { reps: 10, weight: 42.5, completed: true })] },
      });
      expect(res.status).toBe(200);
      expect(res.body.log.sets[0]).toMatchObject({ reps: 10, weight: 42.5, completed: true });
      expect(res.body.log.sets[0].completedAt).toEqual(expect.any(String));

      // Undo, and clear the weight.
      const undo = await api.request('PATCH', `/workout-logs/${logId}/sets`, {
        token: trainee.token,
        body: { sets: [setUpdate(plan, 0, 0, { weight: null, completed: false })] },
      });
      expect(undo.body.log.sets[0]).toMatchObject({ reps: 10, completed: false });
      expect(undo.body.log.sets[0].weight).toBeUndefined();
      expect(undo.body.log.sets[0].completedAt).toBeUndefined();
    });

    it('refuses unknown sets and bad values', async () => {
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;
      const patch = (sets: unknown) => api.request('PATCH', `/workout-logs/${logId}/sets`, { token: trainee.token, body: { sets } });

      expect((await patch([setUpdate(plan, 0, 9, { completed: true })])).status).toBe(400);
      expect((await patch([setUpdate(plan, 0, 0, { reps: -1, completed: true })])).status).toBe(400);
      expect((await patch([setUpdate(plan, 0, 0, { reps: 2.5, completed: true })])).status).toBe(400);
      expect((await patch([setUpdate(plan, 0, 0, {})])).status).toBe(400);
      expect((await patch('nope')).status).toBe(400);
    });

    it('adds an extra set at the next index only, and counts it at finish', async () => {
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;
      const patch = (sets: unknown) => api.request('PATCH', `/workout-logs/${logId}/sets`, { token: trainee.token, body: { sets } });

      // The squat has sets 0 and 1: index 2 is added (with a change to set 0 in the same batch), 4 would open a gap.
      const res = await patch([
        setUpdate(plan, 0, 2, { reps: 9, weight: 40, completed: true }),
        setUpdate(plan, 0, 0, { reps: 10, completed: true }),
      ]);
      expect(res.status).toBe(200);
      const squatSets = res.body.log.sets.filter((set: { exerciseId: string }) => set.exerciseId === squatId);
      expect(squatSets).toHaveLength(3);
      expect(squatSets[2]).toMatchObject({ setIndex: 2, type: 'working', reps: 9, weight: 40, completed: true });
      expect(squatSets[2].completedAt).toEqual(expect.any(String));
      expect(squatSets[0]).toMatchObject({ reps: 10, completed: true });
      expect((await patch([setUpdate(plan, 0, 4, { completed: true })])).status).toBe(400);

      // Sent again (a retry after a lost response): the set is updated, not added twice.
      const again = await patch([setUpdate(plan, 0, 2, { reps: 11, weight: 40, completed: true })]);
      expect(again.body.log.sets.filter((set: { exerciseId: string }) => set.exerciseId === squatId)).toHaveLength(3);

      const session = await api.request('GET', `/workout-logs/${logId}/session`, { token: trainee.token });
      expect(session.body.session.log.sets).toHaveLength(5);

      const finished = await api.request('POST', `/workout-logs/${logId}/finish`, { token: trainee.token });
      expect(finished.status).toBe(200);
      expect(finished.body.log.stats).toMatchObject({ setsCompleted: 2, totalVolume: 11 * 40 });
    });

    it("another trainee's log is not found", async () => {
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;
      const body = { sets: [setUpdate(plan, 0, 0, { completed: true })] };

      expect((await api.request('PATCH', `/workout-logs/${logId}/sets`, { token: other.token, body })).status).toBe(404);
      expect((await api.request('GET', `/workout-logs/${logId}/session`, { token: other.token })).status).toBe(404);
      expect((await api.request('POST', `/workout-logs/${logId}/finish`, { token: other.token })).status).toBe(404);
      expect((await api.request('POST', `/workout-logs/${logId}/abandon`, { token: other.token })).status).toBe(404);
    });
  });

  describe('active session and Home', () => {
    it('GET /active and /plans/week point at the open session from any device', async () => {
      const none = await api.request('GET', '/workout-logs/active', { token: trainee.token });
      expect(none.body.session).toBeNull();

      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;

      const active = await api.request('GET', '/workout-logs/active', { token: trainee.token });
      expect(active.body.session.log.id).toBe(logId);

      const week = await api.request('GET', '/plans/week', { token: trainee.token });
      expect(week.body.activeLog).toMatchObject({ logId, workoutTitle: 'Lower Body', workoutId: String(plan.workouts[0]._id) });
      expect(week.body.nextWorkoutId).toBe(String(plan.workouts[0]._id));
    });
  });

  describe('finish', () => {
    it('refuses a workout with no set done', async () => {
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;
      const res = await api.request('POST', `/workout-logs/${logId}/finish`, { token: trainee.token });
      expect(res.status).toBe(400);
      expect((await WorkoutLog.findById(logId))?.status).toBe('in_progress');
    });

    it('takes the last set changes, computes stats, keeps skipped sets and notifies the coach once', async () => {
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;

      const res = await api.request('POST', `/workout-logs/${logId}/finish`, {
        token: trainee.token,
        body: {
          sets: [
            setUpdate(plan, 0, 0, { reps: 10, weight: 40, completed: true }),
            setUpdate(plan, 0, 1, { reps: 8, weight: 40, completed: true }),
            setUpdate(plan, 1, 1, { durationSec: 45, completed: true }),
          ],
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.log).toMatchObject({ status: 'completed', stats: { totalVolume: 720, setsCompleted: 3, prCount: 0 } });
      expect(res.body.log.finishedAt).toEqual(expect.any(String));
      expect(res.body.log.sets.filter((set: { completed: boolean }) => !set.completed)).toHaveLength(1);
      expect(res.body.log.exercises.map((e: { name: string }) => e.name)).toEqual(['Squat', 'Plank']);

      await vi.waitFor(async () => {
        expect(await Notification.countDocuments({ userId: coach.user._id, type: 'workout_completed' })).toBe(1);
      });
      const notification = await Notification.findOne({ userId: coach.user._id }).lean();
      expect(notification?.data).toEqual({ traineeId: trainee.id, traineeName: 't', logId, workoutTitle: 'Lower Body' });

      // Finished: no more changes, no second finish, no second notification.
      const late = await api.request('PATCH', `/workout-logs/${logId}/sets`, {
        token: trainee.token,
        body: { sets: [setUpdate(plan, 1, 0, { completed: true })] },
      });
      expect(late.status).toBe(409);
      expect((await api.request('POST', `/workout-logs/${logId}/finish`, { token: trainee.token })).status).toBe(409);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await Notification.countDocuments({ type: 'workout_completed' })).toBe(1);

      // Home: the workout is done and points at this log.
      const week = await api.request('GET', '/plans/week', { token: trainee.token });
      expect(week.body.plan.workouts[0]).toMatchObject({ status: 'done', logId });
      expect(week.body.activeLog).toBeNull();
    });

    it('a trainee without a coach finishes without a notification', async () => {
      await trainee.user.updateOne({ coachId: null });
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;
      const res = await api.request('POST', `/workout-logs/${logId}/finish`, {
        token: trainee.token,
        body: { sets: [setUpdate(plan, 0, 0, { completed: true })] },
      });
      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await Notification.countDocuments()).toBe(0);
    });
  });

  describe('discard', () => {
    it('closes the log, hides it from her history and lets the workout start fresh', async () => {
      const plan = await createPlan(trainee);
      const logId = (await start(plan)).body.session.log.id;

      const res = await api.request('POST', `/workout-logs/${logId}/abandon`, { token: trainee.token });
      expect(res.status).toBe(200);
      expect(res.body.log.status).toBe('abandoned');
      expect((await api.request('POST', `/workout-logs/${logId}/abandon`, { token: trainee.token })).status).toBe(409);

      const list = await api.request('GET', '/workout-logs', { token: trainee.token });
      expect(list.body.items).toHaveLength(0);

      const again = await start(plan);
      expect(again.status).toBe(201);
      expect(again.body.session.log.id).not.toBe(logId);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await Notification.countDocuments({ type: 'workout_completed' })).toBe(0);
    });
  });
});
