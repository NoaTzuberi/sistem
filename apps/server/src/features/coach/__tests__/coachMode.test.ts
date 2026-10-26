import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { CoachActivityPage, CoachTodayResponse, CoachTraineeList } from '@sistem/types';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Plan } from '../../plans/plan.model';
import { addDays, currentWeekStart, localDateString } from '../../plans/planWeek';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { BodyMetric } from '../../bodyMetrics/bodyMetric.model';
import { Coaching } from '../../coachings/coaching.model';
import { ATTENTION_CONFIG, coachingWeekNumber, resolveAttention, weekOfYear } from '../coachAttention';

// Coach mode (mobile): the attention rule, GET /coach/today and GET /coach/activity — her live coachings only.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const THIS_WEEK = currentWeekStart(TIMEZONE);
const TODAY = localDateString(new Date(), TIMEZONE);
const DAY_MS = 24 * 60 * 60 * 1000;
const EXERCISE_ID = '64b000000000000000000001';

let api: ApiTestClient;
let coach: TestUser;

describe('attention rule (pure)', () => {
  const base = { coachingStatus: 'active' as const, today: '2026-10-29', firstPlanWeek: '2026-10-04', missedThisWeek: 0 };

  it('flags an active trainee after the configured days without a workout', () => {
    const daysAgo = (days: number) => addDays(base.today, -days);
    expect(resolveAttention({ ...base, lastCompletedDate: daysAgo(ATTENTION_CONFIG.noWorkoutDays - 1) })).toBeNull();
    expect(resolveAttention({ ...base, lastCompletedDate: daysAgo(ATTENTION_CONFIG.noWorkoutDays) })).toEqual({
      reason: 'no_workout',
      days: ATTENTION_CONFIG.noWorkoutDays,
    });
  });

  it('counts from the first plan when she never trained, and never flags a waiting coaching', () => {
    expect(resolveAttention({ ...base, lastCompletedDate: null, firstPlanWeek: '2026-10-25' })).toBeNull();
    expect(resolveAttention({ ...base, lastCompletedDate: null })).toMatchObject({ reason: 'no_workout' });
    expect(resolveAttention({ ...base, coachingStatus: 'waiting', lastCompletedDate: null })).toBeNull();
  });

  it('flags missed workouts this week', () => {
    expect(resolveAttention({ ...base, lastCompletedDate: base.today, missedThisWeek: 1 })).toBeNull();
    expect(resolveAttention({ ...base, lastCompletedDate: base.today, missedThisWeek: 2 })).toEqual({ reason: 'missed_workouts', count: 2 });
  });

  it('numbers the coaching week and the calendar week', () => {
    expect(coachingWeekNumber(null, '2026-10-25')).toBeNull();
    expect(coachingWeekNumber('2026-11-01', '2026-10-25')).toBeNull();
    expect(coachingWeekNumber('2026-10-25', '2026-10-25')).toBe(1);
    expect(coachingWeekNumber('2026-09-06', '2026-10-25')).toBe(8);
    // 1 Jan 2026 is a Thursday: Sun 4 Jan starts week 2.
    expect(weekOfYear('2026-01-01')).toBe(1);
    expect(weekOfYear('2026-01-03')).toBe(1);
    expect(weekOfYear('2026-01-04')).toBe(2);
  });
});

async function createPlan(trainee: TestUser, weekStartDate: string, dayOfWeek = 0) {
  return Plan.create({
    traineeId: trainee.user._id,
    coachId: coach.user._id,
    weekStartDate,
    status: 'published',
    publishedAt: new Date(),
    workouts: [
      { title: 'Lower Body', dayOfWeek, order: 0, exercises: [{ exerciseId: EXERCISE_ID, sets: 3, reps: 10 }] },
      { title: 'Upper Body', order: 1, exercises: [{ exerciseId: EXERCISE_ID, sets: 3, reps: 10 }] },
    ],
  });
}

async function complete(plan: Awaited<ReturnType<typeof createPlan>>, index: number, finishedAt = new Date()) {
  return WorkoutLog.create({
    traineeId: plan.traineeId,
    planId: plan._id,
    workoutId: plan.workouts[index]._id,
    workoutTitle: plan.workouts[index].title,
    status: 'completed',
    startedAt: new Date(finishedAt.getTime() - 3600_000),
    finishedAt,
    rating: 4,
    stats: { durationSec: 2520, totalVolume: 1000, setsCompleted: 18, prCount: 0 },
    sets: [{ exerciseId: EXERCISE_ID, setIndex: 0, type: 'working', reps: 10, weight: 40, completed: true }],
  });
}

describe('coach mode API', () => {
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
    coach = await createTestUser('coach@example.com', { role: 'coach', timezone: TIMEZONE });
  });

  it('needs a coach', async () => {
    const trainee = await createTestUser('t@example.com');
    expect((await api.request('GET', '/coach/today', { token: trainee.token })).status).toBe(403);
    expect((await api.request('GET', '/coach/activity', { token: trainee.token })).status).toBe(403);
    expect((await api.request('GET', '/coach/activity?limit=0', { token: coach.token })).body.code).toBe('activity_limit_invalid');
    expect((await api.request('GET', '/coach/activity?before=yesterday', { token: coach.token })).body.code).toBe('activity_before_invalid');
  });

  it('Today: trained this week, waiting and attention, matching the list', async () => {
    const onboarded = { timezone: TIMEZONE, onboardingStatus: 'completed' as const, onboardingCompletedAt: new Date(Date.now() - 40 * DAY_MS) };
    const trained = await createTestUser('trained@example.com', { coachId: coach.user._id, coachingStatus: 'active', ...onboarded });
    const idle = await createTestUser('idle@example.com', { coachId: coach.user._id, coachingStatus: 'active', ...onboarded });
    await createTestUser('waiting@example.com', { coachId: coach.user._id, ...onboarded });

    const trainedPlan = await createPlan(trained, THIS_WEEK);
    await complete(trainedPlan, 0);
    const oldPlan = await createPlan(idle, addDays(THIS_WEEK, -14));
    await createPlan(idle, THIS_WEEK);
    await complete(oldPlan, 1, new Date(Date.now() - 9 * DAY_MS));

    const res = await api.request<CoachTodayResponse>('GET', '/coach/today', { token: coach.token });
    expect(res.status).toBe(200);
    expect(res.body.today).toBe(localDateString(new Date(), TIMEZONE));
    expect(res.body.scoreboard).toEqual({ trainedThisWeek: 1, activeTrainees: 2, waiting: 1, attention: 1 });
    expect(res.body.waiting.map((trainee) => trainee.email)).toEqual(['waiting@example.com']);
    expect(res.body.attention[0]).toMatchObject({ email: 'idle@example.com', attention: { reason: 'no_workout' } });

    const list = await api.request<CoachTraineeList>('GET', '/coach/trainees', { token: coach.token });
    const trainedRow = list.body.items.find((trainee) => trainee.email === 'trained@example.com')!;
    expect(trainedRow.thisWeek).toMatchObject({ planned: 2, completed: 1 });
    expect(trainedRow.thisWeek!.workouts[0]).toMatchObject({ title: 'Lower Body', status: 'done', kind: 'strength', dayOfWeek: 0 });
    expect(trainedRow.coachingWeek).toBe(1);
    expect(list.body.items.find((trainee) => trainee.email === 'idle@example.com')!.coachingWeek).toBe(3);
    expect(list.body.items.find((trainee) => trainee.email === 'waiting@example.com')).toMatchObject({ thisWeek: null, coachingWeek: null, attention: null });
  });

  it('activity: her events newest first, paged, never another coach’s or an ended coaching’s', async () => {
    const maya = await createTestUser('maya@example.com', { coachId: coach.user._id, coachingStatus: 'active', timezone: TIMEZONE });
    // She joined a while ago, so her body days below are inside the coaching.
    await Coaching.updateOne({ _id: maya.coachingId }, { startedAt: new Date(Date.now() - 30 * DAY_MS) });
    const plan = await createPlan(maya, THIS_WEEK);
    await complete(plan, 0, new Date(Date.now() - 60_000));
    await Coaching.updateOne({ _id: maya.coachingId }, { startedAt: new Date(Date.now() - 30 * DAY_MS) });
    const older = await BodyMetric.create({ traineeId: maya.user._id, date: addDays(TODAY, -8), weight: 64, measurements: { waist: 72 } });
    await BodyMetric.collection.updateOne({ _id: older._id }, { $set: { updatedAt: new Date(Date.now() - 8 * DAY_MS) } });
    await BodyMetric.create({ traineeId: maya.user._id, date: TODAY, weight: 63.5, measurements: { waist: 70.4 } });

    const otherCoach = await createTestUser('other@example.com', { role: 'coach' });
    const theirs = await createTestUser('theirs@example.com', { coachId: otherCoach.user._id, coachingStatus: 'active' });
    const theirPlan = await Plan.create({
      traineeId: theirs.user._id,
      coachId: otherCoach.user._id,
      weekStartDate: THIS_WEEK,
      status: 'published',
      workouts: [{ title: 'Theirs', order: 0, exercises: [{ exerciseId: EXERCISE_ID, sets: 3, reps: 10 }] }],
    });
    await WorkoutLog.create({
      traineeId: theirs.user._id,
      planId: theirPlan._id,
      workoutId: theirPlan.workouts[0]._id,
      workoutTitle: 'Theirs',
      status: 'completed',
      finishedAt: new Date(),
    });
    const ended = await createTestUser('ended@example.com', { coachId: coach.user._id });
    await Coaching.updateOne({ _id: ended.coachingId }, { status: 'ended', live: false, endedAt: new Date() });

    const first = await api.request<CoachActivityPage>('GET', '/coach/activity?limit=2', { token: coach.token });
    expect(first.status).toBe(200);
    const types = first.body.items.map((item) => item.type);
    expect(types).toEqual(['measurements_updated', 'workout_completed']);
    expect(first.body.items[0]).toMatchObject({ trainee: { name: 'maya' }, weightKg: 63.5, change: { id: 'waist', delta: -1.6 } });
    expect(first.body.items[1]).toMatchObject({ workoutTitle: 'Lower Body', setsCompleted: 18, durationSec: 2520, rating: 4 });
    expect(first.body.nextBefore).not.toBeNull();

    const rest: string[] = [];
    let before = first.body.nextBefore;
    while (before) {
      const page = await api.request<CoachActivityPage>('GET', `/coach/activity?limit=2&before=${encodeURIComponent(before)}`, { token: coach.token });
      rest.push(...page.body.items.map((item) => item.type));
      before = page.body.nextBefore;
    }
    expect(rest).toEqual(['measurements_updated', 'trainee_joined']);
    const all = [...first.body.items.map((item) => item.trainee.name)];
    expect(all).not.toContain('theirs');
    expect(all).not.toContain('ended');
  });
});
