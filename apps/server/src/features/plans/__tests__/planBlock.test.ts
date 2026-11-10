import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Exercise } from '../../exercises/exercise.model';
import { Notification } from '../../notifications/notification.model';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { Plan } from '../plan.model';
import { PlanBlock } from '../planBlock.model';
import { addDays, currentWeekStart } from '../planWeek';
import { copyStepsFor, countWeightIncreases, deloadSetCount, progressExercise, weekVolume } from '../planBlockCopy';
import type { CoachPlan, PlanBlockWeek } from '@sistem/types';

// Multi-week plans (2026-11-09): a block = N weekly plans created, copied forward, published,
// unpublished and deleted together; her app shows only weeks that started.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const TIMEZONE = 'Asia/Jerusalem';
const THIS_WEEK = currentWeekStart(TIMEZONE);
const week = (n: number) => addDays(THIS_WEEK, (n - 1) * 7);

let api: ApiTestClient;
let coach: TestUser;
let trainee: TestUser;
let squat: string;
let lunge: string;

async function createExercise(name: string): Promise<string> {
  const exercise = await Exercise.create({
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    primaryMuscles: ['quadriceps'],
    equipment: ['barbell'],
    difficulty: 'beginner',
    movementType: 'strength',
    source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() },
  });
  return String(exercise._id);
}

const plansPath = () => `/coach/trainees/${trainee.id}/plans`;

async function createBlock(lengthWeeks = 4, deloadLastWeek = true): Promise<CoachPlan> {
  const res = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: THIS_WEEK, lengthWeeks, deloadLastWeek } });
  expect(res.status).toBe(201);
  return res.body.plan;
}

function blockWorkouts() {
  return [
    {
      title: 'Lower Body',
      dayOfWeek: 1,
      exercises: [
        { exerciseId: squat, sets: 4, reps: 8, targetWeight: 40, progression: 'weight' },
        { exerciseId: lunge, sets: 3, reps: 12, progression: 'reps' },
      ],
    },
  ];
}

async function fillWeekOne(plan: CoachPlan) {
  const res = await api.request('PUT', `${plansPath()}/${plan.id}`, { token: coach.token, body: { workouts: blockWorkouts() } });
  expect(res.status).toBe(200);
  return res.body.plan as CoachPlan;
}

/** Week 1 becomes last week, week 2 this week (week 2 first: the unique week index). */
async function moveTwoWeekBlockBack(blockId: string) {
  await Plan.updateOne({ blockId, blockWeek: 1 }, { $set: { weekStartDate: addDays(THIS_WEEK, -7) } });
  await Plan.updateOne({ blockId, blockWeek: 2 }, { $set: { weekStartDate: THIS_WEEK } });
  await PlanBlock.updateOne({ _id: blockId }, { $set: { startWeek: addDays(THIS_WEEK, -7) } });
}

async function copyForward(planId: string) {
  return api.request('POST', `${plansPath()}/${planId}/copy-forward`, { token: coach.token });
}

describe('multi-week plans (blocks)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Promise.all([Plan.init(), PlanBlock.init(), Notification.init()]);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', {
      coachId: coach.user._id,
      onboardingStatus: 'completed',
      onboardingCompletedAt: new Date(),
      timezone: TIMEZONE,
    });
    squat = await createExercise('Barbell Squat');
    lunge = await createExercise('Walking Lunge');
  });

  it('creates N weekly plans in one block; every week must be free', async () => {
    const plan = await createBlock(4);
    expect(plan.block).toMatchObject({ week: 1, lengthWeeks: 4, startWeek: THIS_WEEK, status: 'draft', deloadLastWeek: true });
    expect(plan.blockWeeks?.map((entry) => [entry.week, entry.weekStartDate, entry.workoutCount, entry.isDeload])).toEqual([
      [1, week(1), 0, false],
      [2, week(2), 0, false],
      [3, week(3), 0, false],
      [4, week(4), 0, true],
    ]);
    expect(await Plan.countDocuments({ blockId: plan.block!.id })).toBe(4);

    // Week 3 of a second block starting next week is taken → nothing is created.
    const clash = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: week(3), lengthWeeks: 3 } });
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe('plan_block_week_taken');
    expect(await PlanBlock.countDocuments()).toBe(1);

    const tooLong = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: week(6), lengthWeeks: 9 } });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.code).toBe('plan_block_length_invalid');
  });

  it('a new block over drafts: empty ones go silently, ones with content ask (their weeks), published refuses', async () => {
    const weekly = async (weekStartDate: string, workouts: unknown[] = []) => {
      const res = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate } });
      expect(res.status).toBe(201);
      if (workouts.length > 0) await api.request('PUT', `${plansPath()}/${res.body.plan.id}`, { token: coach.token, body: { workouts } });
      return res.body.plan as CoachPlan;
    };
    await weekly(week(1));
    await weekly(week(2), blockWorkouts());
    await weekly(week(3), blockWorkouts());

    const asked = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: week(1), lengthWeeks: 4 } });
    expect(asked.status).toBe(409);
    expect(asked.body).toMatchObject({ code: 'plan_block_has_drafts', weeks: [week(2), week(3)] });
    expect(await PlanBlock.countDocuments()).toBe(0);
    expect(await Plan.countDocuments()).toBe(3);

    const replaced = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: week(1), lengthWeeks: 4, replaceDraft: true } });
    expect(replaced.status).toBe(201);
    expect(await Plan.countDocuments()).toBe(4);
    expect(await Plan.countDocuments({ blockId: { $ne: null } })).toBe(4);

    // A published week in the range: refused, even with replaceDraft.
    const published = await weekly(week(6), blockWorkouts());
    expect((await api.request('POST', `${plansPath()}/${published.id}/publish`, { token: coach.token })).status).toBe(200);
    const blocked = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: week(5), lengthWeeks: 3, replaceDraft: true } });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('plan_block_week_taken');
  });

  it('a weekly plan is unchanged: no block, no blockWeeks', async () => {
    const res = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: THIS_WEEK } });
    expect(res.status).toBe(201);
    expect(res.body.plan.block).toBeUndefined();
    expect(res.body.plan.blockWeeks).toBeUndefined();
  });

  it('copy forward writes the progression into each week and cuts the light week to 70% of the sets', async () => {
    const first = await fillWeekOne(await createBlock(4, true));
    expect(first.workouts[0].exercises[0].progression).toBe('weight');

    const res = await copyForward(first.id);
    expect(res.status).toBe(200);
    expect(res.body.copiedWeeks).toEqual([2, 3, 4]);

    const weeks = await Plan.find({ blockId: first.block!.id }).sort({ blockWeek: 1 }).lean();
    const squatOf = (n: number) => weeks[n - 1].workouts[0].exercises[0];
    const lungeOf = (n: number) => weeks[n - 1].workouts[0].exercises[1];
    expect([1, 2, 3, 4].map((n) => squatOf(n).targetWeight)).toEqual([40, 42.5, 45, 45]);
    expect([1, 2, 3, 4].map((n) => lungeOf(n).reps)).toEqual([12, 13, 14, 14]);
    expect([1, 2, 3, 4].map((n) => squatOf(n).sets)).toEqual([4, 4, 4, 3]);
    // Fresh ids per week: logs of one week never point into another.
    expect(String(squatOf(2)._id)).not.toBe(String(squatOf(1)._id));

    // The ribbon's volume rises, then dips in the light week.
    const volumes = (res.body.plan.blockWeeks as PlanBlockWeek[]).map((entry) => entry.volume.value);
    expect(volumes).toEqual([1280, 1360, 1440, 1080]);

    // The last week has nothing after it.
    const last = await copyForward(String(weeks[3]._id));
    expect(last.status).toBe(409);
    expect(last.body.code).toBe('plan_block_nothing_after');
  });

  it('publishes all weeks at once (issues carry their week) and announces once', async () => {
    const first = await fillWeekOne(await createBlock(3, false));

    const early = await api.request('POST', `${plansPath()}/${first.id}/publish`, { token: coach.token });
    expect(early.status).toBe(400);
    expect(early.body.issues.map((issue: { blockWeek: number }) => issue.blockWeek)).toEqual([2, 3]);

    await copyForward(first.id);
    const published = await api.request('POST', `${plansPath()}/${first.id}/publish`, { token: coach.token, body: { introMessage: 'Go {name}' } });
    expect(published.status).toBe(200);
    expect(await Plan.countDocuments({ blockId: first.block!.id, status: 'published' })).toBe(3);
    expect((await PlanBlock.findById(first.block!.id))!.status).toBe('published');
    // The message goes with week 1 only.
    expect(await Plan.countDocuments({ blockId: first.block!.id, introMessage: 'Go {name}' })).toBe(1);

    // Publishing again (from another week) announces nothing new.
    const week2 = await Plan.findOne({ blockId: first.block!.id, blockWeek: 2 });
    await api.request('POST', `${plansPath()}/${String(week2!._id)}/publish`, { token: coach.token });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await Notification.countDocuments({ userId: trainee.user._id, type: 'plan_published' })).toBe(1);
  });

  it('her app: this week with "week 1 of 3", later weeks locked and not readable', async () => {
    const first = await fillWeekOne(await createBlock(3, true));
    await copyForward(first.id);
    await api.request('POST', `${plansPath()}/${first.id}/publish`, { token: coach.token });

    const list = await api.request('GET', '/plans', { token: trainee.token });
    expect(list.status).toBe(200);
    expect(list.body.items.map((plan: { weekStartDate: string }) => plan.weekStartDate)).toEqual([THIS_WEEK]);
    expect(list.body.items[0].block).toEqual({ week: 1, lengthWeeks: 3, isDeload: false, weightIncreases: 0 });
    expect(list.body.items[0].workouts[0].exercises[0].progression).toBeUndefined();
    expect(list.body.lockedWeeks).toEqual([
      { weekStartDate: week(2), week: 2, lengthWeeks: 3, workoutCount: 1, isDeload: false },
      { weekStartDate: week(3), week: 3, lengthWeeks: 3, workoutCount: 1, isDeload: true },
    ]);

    const week2 = await Plan.findOne({ blockId: first.block!.id, blockWeek: 2 });
    const hidden = await api.request('GET', `/plans/${String(week2!._id)}`, { token: trainee.token });
    expect(hidden.status).toBe(404);

    const home = await api.request('GET', '/plans/week', { token: trainee.token });
    expect(home.body.plan.block).toMatchObject({ week: 1, lengthWeeks: 3 });
  });

  it('week 2 counts the exercises that got heavier than week 1', async () => {
    const first = await fillWeekOne(await createBlock(2, false));
    await copyForward(first.id);
    await api.request('POST', `${plansPath()}/${first.id}/publish`, { token: coach.token });
    // Move the block one week back: week 2 is now her current week.
    await moveTwoWeekBlockBack(first.block!.id);

    const home = await api.request('GET', '/plans/week', { token: trainee.token });
    expect(home.body.plan.block).toEqual({ week: 2, lengthWeeks: 2, isDeload: false, weightIncreases: 1 });
  });

  it('a draft block changes length; a published one does not', async () => {
    const first = await createBlock(4);
    const shorter = await api.request('PATCH', `${plansPath()}/${first.id}/block`, { token: coach.token, body: { lengthWeeks: 3 } });
    expect(shorter.status).toBe(200);
    expect(shorter.body.plan.blockWeeks).toHaveLength(3);
    expect(await Plan.countDocuments({ weekStartDate: week(4) })).toBe(0);

    const longer = await api.request('PATCH', `${plansPath()}/${first.id}/block`, { token: coach.token, body: { lengthWeeks: 5, deloadLastWeek: false } });
    expect(longer.body.plan.blockWeeks.map((entry: PlanBlockWeek) => entry.weekStartDate)).toEqual([1, 2, 3, 4, 5].map(week));
    expect(longer.body.plan.block.deloadLastWeek).toBe(false);

    await fillWeekOne(first);
    await copyForward(first.id);
    await api.request('POST', `${plansPath()}/${first.id}/publish`, { token: coach.token });
    const refused = await api.request('PATCH', `${plansPath()}/${first.id}/block`, { token: coach.token, body: { lengthWeeks: 2 } });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('plan_block_published');
  });

  it('unpublish and delete take the whole block — never once she started a week', async () => {
    const first = await fillWeekOne(await createBlock(2, false));
    await copyForward(first.id);
    await api.request('POST', `${plansPath()}/${first.id}/publish`, { token: coach.token });

    const unpublished = await api.request('POST', `${plansPath()}/${first.id}/unpublish`, { token: coach.token });
    expect(unpublished.status).toBe(200);
    expect(await Plan.countDocuments({ blockId: first.block!.id, status: 'draft' })).toBe(2);

    await WorkoutLog.create({
      traineeId: trainee.user._id,
      planId: new Types.ObjectId(first.id),
      workoutId: new Types.ObjectId(first.workouts[0].id),
      workoutTitle: 'Lower Body',
      status: 'in_progress',
      startedAt: new Date(),
      sets: [],
    });
    const week2 = await Plan.findOne({ blockId: first.block!.id, blockWeek: 2 });
    const refused = await api.request('DELETE', `${plansPath()}/${String(week2!._id)}`, { token: coach.token });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('plan_locked');

    await WorkoutLog.deleteMany({});
    const deleted = await api.request('DELETE', `${plansPath()}/${String(week2!._id)}`, { token: coach.token });
    expect(deleted.status).toBe(204);
    expect(await Plan.countDocuments({ blockId: first.block!.id })).toBe(0);
    expect(await PlanBlock.countDocuments()).toBe(0);
  });

  it('"ends this week" is made once, when the coach opens Today in the last week', async () => {
    const first = await fillWeekOne(await createBlock(2, false));
    await copyForward(first.id);
    await api.request('POST', `${plansPath()}/${first.id}/publish`, { token: coach.token });

    // Not the last week yet: nothing.
    await api.request('GET', '/coach/today', { token: coach.token });
    expect(await Notification.countDocuments({ userId: coach.user._id, type: 'plan_block_ending' })).toBe(0);

    // One week later its last week is now.
    await moveTwoWeekBlockBack(first.block!.id);

    await api.request('GET', '/coach/today', { token: coach.token });
    const list = await api.request('GET', '/notifications', { token: coach.token });
    const ending = list.body.items.filter((item: { type: string }) => item.type === 'plan_block_ending');
    expect(ending).toHaveLength(1);
    expect(ending[0].data).toEqual({ traineeId: trainee.id, traineeName: trainee.user.name, blockId: first.block!.id, weekStartDate: THIS_WEEK });
  });
});

describe('block copy rules (pure)', () => {
  const base = { exerciseId: new Types.ObjectId(), sets: 4, reps: 8, repsMax: 10, targetWeight: 40 };

  it('adds +2.5 kg or +1 rep (range kept) per step; no rule = unchanged', () => {
    expect(progressExercise({ ...base, progression: 'weight' }, 2, false)).toMatchObject({ targetWeight: 45, reps: 8, sets: 4 });
    expect(progressExercise({ ...base, progression: 'reps' }, 2, false)).toMatchObject({ targetWeight: 40, reps: 10, repsMax: 12 });
    expect(progressExercise(base, 3, false)).toMatchObject({ targetWeight: 40, reps: 8 });
  });

  it('a light week keeps 70% of the sets (at least one), per-set lists too', () => {
    expect([1, 2, 3, 4, 5].map(deloadSetCount)).toEqual([1, 1, 2, 3, 4]);
    const pyramid = { ...base, setTargets: [1, 2, 3].map(() => ({ type: 'working' as const, reps: 8, targetWeight: 40 })), progression: 'weight' as const };
    const light = progressExercise(pyramid, 1, true);
    expect(light.sets).toBe(2);
    expect(light.setTargets?.map((target) => target.targetWeight)).toEqual([42.5, 42.5]);
  });

  it('the light week takes the weights of the week before it', () => {
    expect(copyStepsFor(1, 2, 4, true)).toEqual({ steps: 1, deload: false });
    expect(copyStepsFor(1, 4, 4, true)).toEqual({ steps: 2, deload: true });
    expect(copyStepsFor(1, 4, 4, false)).toEqual({ steps: 3, deload: false });
  });

  it('volume = sets × reps × kg; no weights = the set count; heavier exercises are counted', () => {
    expect(weekVolume([{ exercises: [{ sets: 3, reps: 10, targetWeight: 20 }] }])).toEqual({ value: 600, unit: 'kg' });
    expect(weekVolume([{ exercises: [{ sets: 3, durationSec: 30 }, { sets: 2, reps: 10 }] }])).toEqual({ value: 5, unit: 'sets' });
    const id = new Types.ObjectId();
    const before = [{ exercises: [{ exerciseId: id, sets: 3, reps: 8, targetWeight: 40 }, { exerciseId: id, sets: 3, reps: 8 }] }];
    const after = [{ exercises: [{ exerciseId: id, sets: 3, reps: 8, targetWeight: 42.5 }, { exerciseId: id, sets: 3, reps: 9 }] }];
    expect(countWeightIncreases(before, after)).toBe(1);
  });
});
