import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { addDays, localDateString, weekStartOf } from '../../plans/planWeek';
import { Plan } from '../../plans/plan.model';
import { CardioLog } from '../cardio.model';
import { cardioTotals, flattenCardioSteps } from '../cardioSteps';
import { migrateCardioSessions } from '../cardioSessionMigration';
import type { CardioStepFields } from '../cardio.types';

// Cardio workouts live in the weekly plan (kind 'cardio'): the coach saves / publishes them with the
// plan, the trainee sees them with a server-made status, opens one and logs it once.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';

const INTERVALS: CardioStepFields[] = [
  { type: 'block', id: 'w', kind: 'warmup', durationSec: 300, intensity: 3 },
  {
    type: 'repeat',
    id: 'r',
    times: 8,
    blocks: [
      { type: 'block', id: 'r1', kind: 'work', durationSec: 60, intensity: 8 },
      { type: 'block', id: 'r2', kind: 'recovery', durationSec: 60, intensity: 4 },
    ],
  },
  { type: 'block', id: 'c', kind: 'cooldown', durationSec: 300, intensity: 3 },
];

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
let today: string;
let weekStart: string;
let todayDay: number;

const cardioWorkout = (overrides: Record<string, unknown> = {}) => ({
  title: 'Intervals 1:1',
  dayOfWeek: todayDay,
  notes: 'Hard to talk on the fast parts.',
  kind: 'cardio',
  cardio: { sport: 'intervals', metric: 'rpe', steps: INTERVALS },
  exercises: [],
  ...overrides,
});

async function createPlan(week = weekStart) {
  const res = await api.request('POST', `/coach/trainees/${trainee.id}/plans`, { token: coach.token, body: { weekStartDate: week } });
  expect(res.status).toBe(201);
  return res.body.plan.id as string;
}

function savePlan(planId: string, workouts: unknown[]) {
  return api.request('PUT', `/coach/trainees/${trainee.id}/plans/${planId}`, { token: coach.token, body: { workouts } });
}

/** A published plan of this week with one cardio workout today; returns its ids. */
async function publishedCardioPlan(workouts: unknown[] = [cardioWorkout()]) {
  const planId = await createPlan();
  const saved = await savePlan(planId, workouts);
  expect(saved.status).toBe(200);
  expect((await api.request('POST', `/coach/trainees/${trainee.id}/plans/${planId}/publish`, { token: coach.token })).status).toBe(200);
  return { planId, workoutId: saved.body.plan.workouts[0].id as string };
}

function logBody(planId: string, workoutId: string, overrides: Record<string, unknown> = {}) {
  return { planId, workoutId, completedSec: 1560, roundsDone: 8, highIntensitySec: 480, distanceKm: 4.26, rpe: 8, note: 'Felt good', ...overrides };
}

describe('cardio step math', () => {
  it('unrolls repeat sets and totals the time, high intensity (≥ 7) and rounds', () => {
    expect(flattenCardioSteps(INTERVALS)).toHaveLength(18);
    expect(cardioTotals(INTERVALS)).toEqual({ totalSec: 1560, highIntensitySec: 480, rounds: 8 });
  });
});

describe('cardio workouts in the plan', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Promise.all([CardioLog.init(), Plan.init()]);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('coach@example.com', { role: 'coach', name: 'Shaked' });
    otherCoach = await createTestUser('other-coach@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, timezone: TIMEZONE });
    today = localDateString(new Date(), TIMEZONE);
    weekStart = weekStartOf(today);
    todayDay = new Date(`${today}T00:00:00Z`).getUTCDay();
  });

  it('saves a cardio workout next to a strength one, with its day and note, and keeps its id', async () => {
    const planId = await createPlan();
    const saved = await savePlan(planId, [{ title: 'Strength A', exercises: [] }, cardioWorkout()]);
    expect(saved.status).toBe(200);
    const [strength, cardio] = saved.body.plan.workouts;
    expect(strength.kind).toBeUndefined();
    expect(cardio).toMatchObject({ kind: 'cardio', dayOfWeek: todayDay, notes: 'Hard to talk on the fast parts.', cardio: { sport: 'intervals', metric: 'rpe' }, exercises: [] });
    expect(cardio.cardio.steps).toHaveLength(3);

    const again = await savePlan(planId, [{ id: cardio.id, ...cardioWorkout({ title: 'Easy run' }) }]);
    expect(again.body.plan.workouts[0]).toMatchObject({ id: cardio.id, title: 'Easy run', kind: 'cardio' });
  });

  it('rejects bad cardio: durations, rounds, intensity, empty steps, exercises on a cardio workout', async () => {
    const planId = await createPlan();
    const block = (fields: Record<string, unknown>) => [{ type: 'block', id: 'a', kind: 'steady', durationSec: 600, intensity: 6, ...fields }];
    const codeOf = async (cardio: unknown, extra: Record<string, unknown> = {}) =>
      (await savePlan(planId, [cardioWorkout({ cardio, ...extra })])).body.issues?.[0]?.code;
    expect(await codeOf({ sport: 'run', metric: 'rpe', steps: block({ durationSec: 10 }) })).toBe('cardio_block_duration');
    expect(await codeOf({ sport: 'run', metric: 'rpe', steps: block({ intensity: 11 }) })).toBe('cardio_block_intensity');
    expect(await codeOf({ sport: 'run', metric: 'rpe', steps: [{ type: 'repeat', id: 'r', times: 31, blocks: block({}) }] })).toBe('cardio_repeat_times');
    expect(await codeOf({ sport: 'run', metric: 'rpe', steps: [] })).toBe('cardio_steps_empty');
    expect(await codeOf({ sport: 'swim', metric: 'rpe', steps: block({}) })).toBe('cardio_sport_invalid');
    expect(await codeOf({ sport: 'run', metric: 'rpe', steps: block({}) }, { exercises: [{ exerciseId: new mongoose.Types.ObjectId().toString(), sets: 3, reps: 10 }] })).toBe('plan_cardio_no_exercises');
  });

  it('publishes a plan whose workouts are all cardio; an empty strength workout still blocks publishing', async () => {
    await publishedCardioPlan();
    const next = await createPlan(addDays(weekStart, 7));
    await savePlan(next, [cardioWorkout(), { title: 'Strength A', exercises: [] }]);
    const res = await api.request('POST', `/coach/trainees/${trainee.id}/plans/${next}/publish`, { token: coach.token });
    expect(res.status).toBe(400);
    expect(res.body.issues.map((issue: { code: string; workoutIndex: number }) => [issue.code, issue.workoutIndex])).toEqual([['plan_workout_needs_exercise', 1]]);
  });

  it('the trainee sees the cardio workout in her week with a status; "start next" stays strength-only', async () => {
    const { workoutId } = await publishedCardioPlan();
    const week = await api.request('GET', '/plans/week', { token: trainee.token });
    expect(week.body.plan.workouts[0]).toMatchObject({ id: workoutId, kind: 'cardio', status: 'upcoming', isToday: true, logId: null });
    expect(week.body.nextWorkoutId).toBeNull();
    // It never starts a strength session.
    const start = await api.request('POST', '/workout-logs', { token: trainee.token, body: { planId: week.body.plan.id, workoutId } });
    expect(start.status).toBe(404);
  });

  it('she opens it (with her coach’s name), logs it once, it turns done, and the coach reads the log', async () => {
    const { planId, workoutId } = await publishedCardioPlan();
    const page = await api.request('GET', `/cardio/plans/${planId}/workouts/${workoutId}`, { token: trainee.token });
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ coach: { name: 'Shaked' }, log: null, canStart: true, date: today, status: 'upcoming', workout: { kind: 'cardio', title: 'Intervals 1:1' } });
    expect((await api.request('GET', `/cardio/plans/${planId}/workouts/${workoutId}`, { token: coach.token })).status).toBe(403);

    const saved = await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(planId, workoutId) });
    expect(saved.status).toBe(201);
    expect(saved.body.log).toMatchObject({ roundsDone: 8, roundsTotal: 8, distanceKm: 4.3, rpe: 8, workoutTitle: 'Intervals 1:1', date: today });
    expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(planId, workoutId) })).status).toBe(409);

    const week = await api.request('GET', '/plans/week', { token: trainee.token });
    expect(week.body.plan.workouts[0]).toMatchObject({ status: 'done', logId: saved.body.log.id });
    const after = await api.request('GET', `/cardio/plans/${planId}/workouts/${workoutId}`, { token: trainee.token });
    expect(after.body).toMatchObject({ canStart: false, status: 'done' });

    const coachPlans = await api.request('GET', `/coach/trainees/${trainee.id}/plans`, { token: coach.token });
    expect(coachPlans.body.items[0].progress).toMatchObject({ completed: 1, planned: 1 });
    const logs = await api.request('GET', `/coach/trainees/${trainee.id}/cardio-logs`, { token: coach.token });
    expect(logs.body.items).toHaveLength(1);
    expect((await api.request('GET', `/coach/trainees/${trainee.id}/cardio-logs`, { token: otherCoach.token })).status).toBe(404);
  });

  it('a strength workout is not a cardio page; her numbers stay inside the workout', async () => {
    const { planId, workoutId } = await publishedCardioPlan([cardioWorkout()]);
    expect((await api.request('GET', `/cardio/plans/${planId}/workouts/${new mongoose.Types.ObjectId()}`, { token: trainee.token })).status).toBe(404);
    expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(planId, workoutId, { roundsDone: 9 }) })).status).toBe(400);
    expect((await api.request('POST', '/cardio/logs', { token: trainee.token, body: logBody(planId, workoutId, { rpe: 0 }) })).body.code).toBe('cardio_rpe_invalid');
    const early = await api.request('POST', '/cardio/logs', {
      token: trainee.token,
      body: logBody(planId, workoutId, { completedSec: 600, roundsDone: 2, highIntensitySec: 120, distanceKm: null, note: null }),
    });
    expect(early.status).toBe(201);
    expect(early.body.log).toMatchObject({ roundsDone: 2, roundsTotal: 8, distanceKm: null, note: null });
  });

  it('migrates sessions of the old cardio builder into plans, once', async () => {
    const sessions = mongoose.connection.collection('cardiosessions');
    const published = await createPlan(addDays(weekStart, 7));
    await savePlan(published, [cardioWorkout({ title: 'Existing' })]);
    await api.request('POST', `/coach/trainees/${trainee.id}/plans/${published}/publish`, { token: coach.token });
    await sessions.insertMany([
      // Active, Tue + Thu, repeating: its week (no plan yet → a draft) and the later published plan.
      { traineeId: trainee.user._id, coachId: coach.user._id, name: 'Old run', sport: 'run', metric: 'rpe', steps: INTERVALS, note: 'Easy', days: [2, 4], repeatsWeekly: true, weekStartDate: weekStart, status: 'active', archivedAt: null },
      // A draft into a published week: skipped.
      { traineeId: trainee.user._id, coachId: coach.user._id, name: 'Draft', sport: 'walk', metric: 'rpe', steps: INTERVALS, days: [], repeatsWeekly: false, weekStartDate: addDays(weekStart, 7), status: 'draft', archivedAt: null },
    ]);

    expect(await migrateCardioSessions()).toEqual({ sessions: 1, workouts: 4, skipped: 1 });
    const plans = await Plan.find({ traineeId: trainee.id }).sort({ weekStartDate: 1 }).lean();
    expect(plans.map((plan) => plan.status)).toEqual(['draft', 'published']);
    expect(plans[0].workouts.map((workout) => [workout.title, workout.dayOfWeek, workout.kind, workout.notes])).toEqual([
      ['Old run', 2, 'cardio', 'Easy'],
      ['Old run', 4, 'cardio', 'Easy'],
    ]);
    expect(plans[1].workouts.map((workout) => workout.title)).toEqual(['Existing', 'Old run', 'Old run']);

    expect(await migrateCardioSessions()).toEqual({ sessions: 0, workouts: 0, skipped: 1 });
  });
});
