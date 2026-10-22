import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Exercise } from '../../exercises/exercise.model';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { Plan } from '../plan.model';
import { addDays, currentWeekStart, localDateString } from '../planWeek';
import { getTraineeWeek } from '../traineePlan.service';

// Phase 7: what the trainee's Home and Workouts screens read from /api/plans and
// /api/workout-logs — her own published plans, with names, sets and statuses.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const THIS_WEEK = currentWeekStart(TIMEZONE);
const TODAY = localDateString(new Date(), TIMEZONE);

let api: ApiTestClient;
let coach: TestUser;
let trainee: TestUser;
let other: TestUser;
let squatId: string;

async function createPlan(traineeUser: TestUser, weekStartDate: string, status: 'draft' | 'published' = 'published') {
  return Plan.create({
    traineeId: traineeUser.user._id,
    coachId: coach.user._id,
    weekStartDate,
    status,
    publishedAt: status === 'published' ? new Date() : null,
    workouts: [
      { title: 'Lower Body', dayOfWeek: 0, order: 0, exercises: [{ exerciseId: squatId, sets: 3, reps: 10, notes: 'Slow down.' }] },
      { title: 'Any day', order: 1, exercises: [{ exerciseId: squatId, sets: 2, reps: 8 }] },
    ],
  });
}

async function completeWorkout(plan: Awaited<ReturnType<typeof createPlan>>, index: number, traineeUser = trainee) {
  return WorkoutLog.create({
    traineeId: traineeUser.user._id,
    planId: plan._id,
    workoutId: plan.workouts[index]._id,
    workoutTitle: plan.workouts[index].title,
    status: 'completed',
    finishedAt: new Date(),
    sets: [{ exerciseId: squatId, setIndex: 0, type: 'working', reps: 10, weight: 40, completed: true }],
  });
}

describe('trainee plans', () => {
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
    const squat = await Exercise.create({
      slug: 'squat',
      name: 'Squat',
      primaryMuscles: ['quadriceps'],
      equipment: ['barbell'],
      difficulty: 'beginner',
      movementType: 'strength',
      instructions: { execution: 'Copied text that must never be returned.' },
      tips: ['A copied tip.'],
      source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() },
    });
    squatId = String(squat._id);
  });

  describe('GET /plans/week', () => {
    it('needs a token', async () => {
      expect((await api.request('GET', '/plans/week')).status).toBe(401);
    });

    it('no plan this week: plan and nextWorkoutId are null', async () => {
      const res = await api.request('GET', '/plans/week', { token: trainee.token });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ weekStartDate: THIS_WEEK, today: TODAY, plan: null, nextWorkoutId: null });
      expect(res.body.serverTime).toEqual(expect.any(String));
    });

    it('sends her coach’s name only (Home’s coach card), null without a coach', async () => {
      const res = await api.request('GET', '/plans/week', { token: trainee.token });
      expect(res.body.coach).toEqual({ name: coach.user.name });
      const solo = await createTestUser('solo@example.com', { timezone: TIMEZONE });
      expect((await api.request('GET', '/plans/week', { token: solo.token })).body.coach).toBeNull();
    });

    it('returns exercise names (facts only), resolved sets and statuses', async () => {
      const plan = await createPlan(trainee, THIS_WEEK);
      const log = await completeWorkout(plan, 0);

      const res = await api.request('GET', '/plans/week', { token: trainee.token });
      const [lower, anyDay] = res.body.plan.workouts;
      expect(res.body.plan.period).toBe('current');
      expect(lower).toMatchObject({ status: 'done', date: THIS_WEEK, logId: String(log._id) });
      expect(lower.exercises[0].exercise).toEqual({
        id: squatId,
        name: 'Squat',
        primaryMuscles: ['quadriceps'],
        equipment: ['barbell'],
        difficulty: 'beginner',
        movementType: 'strength',
      });
      expect(lower.exercises[0].resolvedSets).toHaveLength(3);
      expect(lower.exercises[0].notes).toBe('Slow down.');
      // No day set: upcoming until the week is over, and it is the next workout.
      expect(anyDay).toMatchObject({ status: 'upcoming', date: null, logId: null });
      expect(res.body.nextWorkoutId).toBe(anyDay.id);
      expect(JSON.stringify(res.body)).not.toContain('Copied text');
      expect(JSON.stringify(res.body)).not.toContain('copied tip');
    });

    it('a draft for this week is invisible', async () => {
      await createPlan(trainee, THIS_WEEK, 'draft');
      const res = await api.request('GET', '/plans/week', { token: trainee.token });
      expect(res.body.plan).toBeNull();
    });

    it('never shows another trainee’s plan or uses her logs', async () => {
      const plan = await createPlan(other, THIS_WEEK);
      await completeWorkout(plan, 0, other);
      const res = await api.request('GET', '/plans/week', { token: trainee.token });
      expect(res.body.plan).toBeNull();
    });

    it('uses the trainee’s stored time zone, not the server’s', async () => {
      // 22:30 UTC on Saturday: still this week in New York, already next week in Jerusalem.
      const now = new Date('2026-10-03T22:30:00Z');
      const newYorker = await createTestUser('ny@example.com', { coachId: coach.user._id, timezone: 'America/New_York' });
      expect((await getTraineeWeek(trainee.id, now)).weekStartDate).toBe('2026-10-04');
      expect((await getTraineeWeek(newYorker.id, now)).weekStartDate).toBe('2026-09-27');
    });
  });

  describe('GET /plans and /plans/:id', () => {
    it('a past week: undone workouts are missed, done ones keep their log', async () => {
      const lastWeek = await createPlan(trainee, addDays(THIS_WEEK, -7));
      await completeWorkout(lastWeek, 1);
      await createPlan(trainee, THIS_WEEK);

      const res = await api.request('GET', '/plans', { token: trainee.token });
      expect(res.body.today).toBe(TODAY);
      expect(res.body.items.map((plan: { period: string }) => plan.period)).toEqual(['current', 'past']);
      const past = res.body.items[1];
      expect(past.workouts.map((workout: { status: string }) => workout.status)).toEqual(['missed', 'done']);
      expect(past.workouts[0].exercises[0].exercise.name).toBe('Squat');
    });

    it('names next week’s Sunday; a plan published for it is listed as upcoming', async () => {
      await createPlan(trainee, addDays(THIS_WEEK, 7));
      const res = await api.request('GET', '/plans', { token: trainee.token });
      expect(res.body.nextWeekStartDate).toBe(addDays(THIS_WEEK, 7));
      expect(res.body.items[0]).toMatchObject({ weekStartDate: addDays(THIS_WEEK, 7), period: 'upcoming' });
    });

    it('a single plan carries the same statuses and names', async () => {
      const plan = await createPlan(trainee, addDays(THIS_WEEK, 7));
      const res = await api.request('GET', `/plans/${plan._id}`, { token: trainee.token });
      expect(res.status).toBe(200);
      expect(res.body.plan.period).toBe('upcoming');
      expect(res.body.plan.workouts[0].status).toBe('upcoming');
      expect(res.body.plan.workouts[0].exercises[0].exercise.name).toBe('Squat');
    });

    it('another trainee’s plan is 404', async () => {
      const plan = await createPlan(other, THIS_WEEK);
      expect((await api.request('GET', `/plans/${plan._id}`, { token: trainee.token })).status).toBe(404);
    });
  });

  describe('GET /workout-logs/:id', () => {
    it('returns the names of the logged exercises, facts only', async () => {
      const plan = await createPlan(trainee, THIS_WEEK);
      const log = await completeWorkout(plan, 0);
      const res = await api.request('GET', `/workout-logs/${log._id}`, { token: trainee.token });
      expect(res.status).toBe(200);
      expect(res.body.log.exercises).toHaveLength(1);
      expect(res.body.log.exercises[0]).toMatchObject({ id: squatId, name: 'Squat' });
      expect(JSON.stringify(res.body)).not.toContain('Copied text');
    });
  });
});
