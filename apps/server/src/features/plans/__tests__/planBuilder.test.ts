import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Exercise } from '../../exercises/exercise.model';
import { Notification } from '../../notifications/notification.model';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { resolveTraineeStatus } from '../../coach/coach.service';
import { Plan } from '../plan.model';
import { addDays, currentWeekStart } from '../planWeek';
import { findPublishIssues } from '../plan.validation';
import type { CoachPlan } from '@sistem/types';

// Phase 6: the coach builds, publishes, unpublishes and deletes plans — only for her
// own trainees — and publishing announces 'plan.published' exactly once.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
type CoachPlanItem = CoachPlan;

const TIMEZONE = 'Asia/Jerusalem';
const THIS_WEEK = currentWeekStart(TIMEZONE);
const NEXT_WEEK = addDays(THIS_WEEK, 7);

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
let otherTrainee: TestUser;
let squat: string;
let curl: string;
let plank: string;

async function createExercise(name: string, fields: Record<string, unknown> = {}): Promise<string> {
  const exercise = await Exercise.create({
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    primaryMuscles: ['quadriceps'],
    equipment: ['barbell'],
    difficulty: 'beginner',
    movementType: 'strength',
    instructions: { execution: 'Copied text that must never be returned.' },
    tips: ['A copied tip.'],
    source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() },
    ...fields,
  });
  return String(exercise._id);
}

function plansPath(traineeId = trainee.id): string {
  return `/coach/trainees/${traineeId}/plans`;
}

async function createDraft(weekStartDate = THIS_WEEK) {
  const res = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate } });
  expect(res.status).toBe(201);
  return res.body.plan;
}

function validWorkouts() {
  return [
    {
      title: 'Lower body',
      dayOfWeek: 0,
      exercises: [
        { exerciseId: squat, sets: 3, reps: 8, repsMax: 12, targetWeight: 40, restSec: 90, supersetGroup: 'a' },
        { exerciseId: curl, sets: 3, reps: 10, supersetGroup: 'A', notes: '  Slow.  ' },
      ],
    },
    { title: 'Core', exercises: [{ exerciseId: plank, sets: 3, durationSec: 45 }] },
  ];
}

async function savePlan(planId: string, workouts: unknown, notes?: string) {
  return api.request('PUT', `${plansPath()}/${planId}`, { token: coach.token, body: { notes, workouts } });
}

async function createPublishedPlan(weekStartDate = THIS_WEEK) {
  const draft = await createDraft(weekStartDate);
  await savePlan(draft.id, validWorkouts());
  const res = await api.request('POST', `${plansPath()}/${draft.id}/publish`, { token: coach.token });
  expect(res.status).toBe(200);
  return res.body.plan;
}

/** Notifications are written by an event listener after the response is sent. */
async function waitForNotifications(userId: string, count: number) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const found = await Notification.find({ userId }).lean();
    if (found.length >= count) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return Notification.find({ userId }).lean();
}

describe('plan builder (coach)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Promise.all([Plan.init(), Notification.init()]);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    otherCoach = await createTestUser('other-coach@example.com', { role: 'coach' });
    const onboarded = { onboardingStatus: 'completed' as const, onboardingCompletedAt: new Date(), timezone: TIMEZONE };
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, ...onboarded });
    otherTrainee = await createTestUser('dana@example.com', { coachId: otherCoach.user._id, ...onboarded });
    squat = await createExercise('Barbell Squat');
    curl = await createExercise('Leg Curl', { reviewStatus: 'published' });
    plank = await createExercise('Plank', { primaryMuscles: ['abdominals'], equipment: ['bodyweight'] });
  });

  describe('authorization', () => {
    it('a trainee cannot use any plan builder route (403)', async () => {
      const plan = await createDraft();
      const calls: [string, string][] = [
        ['GET', '/coach/exercises'],
        ['POST', plansPath()],
        ['GET', `${plansPath()}/${plan.id}`],
        ['PUT', `${plansPath()}/${plan.id}`],
        ['DELETE', `${plansPath()}/${plan.id}`],
        ['POST', `${plansPath()}/${plan.id}/publish`],
        ['POST', `${plansPath()}/${plan.id}/unpublish`],
      ];
      for (const [method, path] of calls) {
        expect((await api.request(method, path, { token: trainee.token })).status).toBe(403);
      }
    });

    it("a coach cannot create or touch plans of another coach's trainee (404)", async () => {
      const plan = await createDraft();
      const create = await api.request('POST', plansPath(), { token: otherCoach.token, body: { weekStartDate: NEXT_WEEK } });
      expect(create.status).toBe(404);
      const publish = await api.request('POST', `${plansPath()}/${plan.id}/publish`, { token: otherCoach.token });
      expect(publish.status).toBe(404);
      const remove = await api.request('DELETE', `${plansPath()}/${plan.id}`, { token: otherCoach.token });
      expect(remove.status).toBe(404);
      expect(await Plan.countDocuments()).toBe(1);
    });

    it("a plan id is only found under its own trainee", async () => {
      const plan = await createDraft();
      // otherCoach asks for it through HER trainee's path.
      const res = await api.request('GET', `${plansPath(otherTrainee.id)}/${plan.id}`, { token: otherCoach.token });
      expect(res.status).toBe(404);
    });
  });

  describe('exercise library', () => {
    it('returns every imported exercise except rejected / inactive ones, facts only', async () => {
      await createExercise('Rejected Raise', { reviewStatus: 'rejected' });
      await createExercise('Inactive Raise', { isActive: false });

      const res = await api.request('GET', '/coach/exercises', { token: coach.token });
      expect(res.status).toBe(200);
      expect(res.body.items.map((item: { name: string }) => item.name)).toEqual(['Barbell Squat', 'Leg Curl', 'Plank']);
      expect(Object.keys(res.body.items[0]).sort()).toEqual(
        ['difficulty', 'equipment', 'id', 'movementType', 'name', 'primaryMuscles'].sort(),
      );
    });

    it('searches (typo tolerant) and filters', async () => {
      const search = await api.request('GET', '/coach/exercises?search=barbel%20sqat', { token: coach.token });
      expect(search.body.items.map((item: { name: string }) => item.name)).toEqual(['Barbell Squat']);
      const filtered = await api.request('GET', '/coach/exercises?muscle=abdominals', { token: coach.token });
      expect(filtered.body.items.map((item: { name: string }) => item.name)).toEqual(['Plank']);
      expect(filtered.body.total).toBe(1);
    });
  });

  describe('create', () => {
    it('creates an empty draft for the week, owned by the coach', async () => {
      const plan = await createDraft();
      expect(plan).toMatchObject({ weekStartDate: THIS_WEEK, status: 'draft', publishedAt: null, workouts: [], locked: false });
      expect(plan.coachId).toBe(coach.id);
    });

    it('rejects a non-Sunday, a past week and a week that already has a plan', async () => {
      const notSunday = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: addDays(THIS_WEEK, 1) } });
      expect(notSunday.status).toBe(400);
      const past = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: addDays(THIS_WEEK, -7) } });
      expect(past.status).toBe(409);
      await createDraft();
      const again = await api.request('POST', plansPath(), { token: coach.token, body: { weekStartDate: THIS_WEEK } });
      expect(again.status).toBe(409);
    });

    it('duplicates the most recent earlier plan as a draft with new ids', async () => {
      const source = await createPublishedPlan(THIS_WEEK);
      const res = await api.request('POST', plansPath(), {
        token: coach.token,
        body: { weekStartDate: NEXT_WEEK, duplicatePrevious: true },
      });
      expect(res.status).toBe(201);
      const copy = res.body.plan;
      expect(copy).toMatchObject({ weekStartDate: NEXT_WEEK, status: 'draft', publishedAt: null });
      expect(copy.workouts.map((workout: { title: string }) => workout.title)).toEqual(['Lower body', 'Core']);
      expect(copy.workouts[0].exercises[0]).toMatchObject({ exerciseId: squat, reps: 8, repsMax: 12, supersetGroup: 'A' });
      expect(copy.workouts[0].id).not.toBe(source.workouts[0].id);
      expect(copy.workouts[0].exercises[0].id).not.toBe(source.workouts[0].exercises[0].id);
    });

    it('409 when there is nothing to duplicate', async () => {
      const res = await api.request('POST', plansPath(), {
        token: coach.token,
        body: { weekStartDate: THIS_WEEK, duplicatePrevious: true },
      });
      expect(res.status).toBe(409);
    });
  });

  describe('save', () => {
    it('stores workouts in order with exercise facts and resolved sets', async () => {
      const draft = await createDraft();
      const res = await savePlan(draft.id, validWorkouts(), 'Week notes');
      expect(res.status).toBe(200);
      const { plan } = res.body;
      expect(plan.notes).toBe('Week notes');
      expect(plan.workouts.map((workout: { order: number }) => workout.order)).toEqual([0, 1]);
      const [first, second] = plan.workouts[0].exercises;
      expect(first.exercise).toMatchObject({ name: 'Barbell Squat', equipment: ['barbell'] });
      expect(first.supersetGroup).toBe('A');
      expect(second.notes).toBe('Slow.');
      expect(plan.workouts[1].exercises[0].resolvedSets).toHaveLength(3);
    });

    it('keeps the ids of existing workouts and exercises when they are reordered', async () => {
      const draft = await createDraft();
      const saved = (await savePlan(draft.id, validWorkouts())).body.plan;
      const [lower, core] = saved.workouts;

      const reordered = [
        { id: core.id, title: 'Core', exercises: core.exercises.map(toInput) },
        { id: lower.id, title: 'Lower body', exercises: [...lower.exercises].reverse().map(toInput) },
        { title: 'New', exercises: [{ id: lower.exercises[0].id, exerciseId: squat, sets: 2, reps: 5 }] },
      ];
      const res = await savePlan(draft.id, reordered);
      expect(res.status).toBe(200);
      const after = res.body.plan.workouts;
      expect(after.map((workout: { id: string }) => workout.id).slice(0, 2)).toEqual([core.id, lower.id]);
      expect(after[1].exercises.map((exercise: { id: string }) => exercise.id)).toEqual([lower.exercises[1].id, lower.exercises[0].id]);
      // An id can be kept once: the second use gets a fresh one.
      expect(after[2].exercises[0].id).not.toBe(lower.exercises[0].id);
      expect(after[2].id).not.toBe(lower.id);
    });

    it('accepts per-set targets and derives the set count', async () => {
      const draft = await createDraft();
      const setTargets = [
        { type: 'warmup', reps: 12, targetWeight: 20 },
        { type: 'working', reps: 8, targetWeight: 45, restSec: 90 },
        { type: 'drop', reps: 12, targetWeight: 30 },
      ];
      const res = await savePlan(draft.id, [{ title: 'Pyramid', exercises: [{ exerciseId: squat, sets: 9, setTargets }] }]);
      expect(res.status).toBe(200);
      const exercise = res.body.plan.workouts[0].exercises[0];
      expect(exercise.sets).toBe(3);
      expect(exercise.resolvedSets.map((set: { type: string }) => set.type)).toEqual(['warmup', 'working', 'drop']);
    });

    it('reports each problem with the workout / exercise it belongs to and saves nothing', async () => {
      const draft = await createDraft();
      const res = await savePlan(draft.id, [
        { title: '', exercises: [] },
        {
          title: 'Legs',
          exercises: [
            { exerciseId: squat, sets: 3, reps: 10 },
            { exerciseId: squat, sets: 3 },
            { exerciseId: squat, sets: 0, reps: 10 },
            { exerciseId: String(new Types.ObjectId()), sets: 3, reps: 10 },
          ],
        },
      ]);
      expect(res.status).toBe(400);
      expect(res.body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ workoutIndex: 0, message: 'A workout needs a title.' }),
          expect.objectContaining({ workoutIndex: 1, exerciseIndex: 1 }),
          expect.objectContaining({ workoutIndex: 1, exerciseIndex: 2 }),
        ]),
      );
      expect(res.body.issues.some((issue: { exerciseIndex?: number }) => issue.exerciseIndex === 0)).toBe(false);
      expect((await Plan.findById(draft.id))!.workouts).toHaveLength(0);

      const unknown = await savePlan(draft.id, [
        { title: 'Legs', exercises: [{ exerciseId: String(new Types.ObjectId()), sets: 3, reps: 10 }] },
      ]);
      expect(unknown.status).toBe(400);
      expect(unknown.body.issues[0]).toMatchObject({ workoutIndex: 0, exerciseIndex: 0 });
    });

    it('a rejected exercise cannot be added', async () => {
      const rejected = await createExercise('Rejected Raise', { reviewStatus: 'rejected' });
      const draft = await createDraft();
      const res = await savePlan(draft.id, [{ title: 'Legs', exercises: [{ exerciseId: rejected, sets: 3, reps: 10 }] }]);
      expect(res.status).toBe(400);
    });
  });

  describe('publish', () => {
    it('findPublishIssues: empty plan, empty workout, lonely and split supersets', () => {
      expect(findPublishIssues([])).toHaveLength(1);
      expect(findPublishIssues([{ exercises: [] }])[0]).toMatchObject({ workoutIndex: 0 });
      expect(findPublishIssues([{ exercises: [{ supersetGroup: 'A' }, {}] }])[0]).toMatchObject({ workoutIndex: 0, exerciseIndex: 0 });
      expect(
        findPublishIssues([{ exercises: [{ supersetGroup: 'A' }, {}, { supersetGroup: 'A' }] }])[0],
      ).toMatchObject({ workoutIndex: 0, exerciseIndex: 2 });
      expect(findPublishIssues([{ exercises: [{ supersetGroup: 'A' }, { supersetGroup: 'A' }, {}] }])).toEqual([]);
    });

    it('refuses a draft that is not ready and leaves it a draft', async () => {
      const draft = await createDraft();
      const empty = await api.request('POST', `${plansPath()}/${draft.id}/publish`, { token: coach.token });
      expect(empty.status).toBe(400);
      expect(empty.body.issues).toHaveLength(1);

      await savePlan(draft.id, [{ title: 'Empty', exercises: [] }]);
      const emptyWorkout = await api.request('POST', `${plansPath()}/${draft.id}/publish`, { token: coach.token });
      expect(emptyWorkout.status).toBe(400);
      expect((await Plan.findById(draft.id))!.status).toBe('draft');
      expect(await Notification.countDocuments()).toBe(0);
    });

    it("publishes, notifies the trainee once and moves her app state to 'home'", async () => {
      const before = await api.request('GET', '/auth/me', { token: trainee.token });
      expect(before.body.user.appState).toBe('waiting');

      const plan = await createPublishedPlan();
      expect(plan.status).toBe('published');
      expect(plan.publishedAt).not.toBeNull();

      const again = await api.request('POST', `${plansPath()}/${plan.id}/publish`, { token: coach.token });
      expect(again.status).toBe(200);
      expect(again.body.plan.publishedAt).toBe(plan.publishedAt);

      const notifications = await waitForNotifications(trainee.id, 1);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({ type: 'plan_published', data: { planId: plan.id, weekStartDate: THIS_WEEK } });

      const after = await api.request('GET', '/auth/me', { token: trainee.token });
      expect(after.body.user.appState).toBe('home');
      const mine = await api.request('GET', '/plans', { token: trainee.token });
      expect(mine.body.items).toHaveLength(1);
    });

    it('a published plan can be edited, but only into something publishable', async () => {
      const plan = await createPublishedPlan();
      const broken = await savePlan(plan.id, [{ title: 'Empty', exercises: [] }]);
      expect(broken.status).toBe(400);

      const edited = await savePlan(plan.id, [{ id: plan.workouts[0].id, title: 'Renamed', exercises: plan.workouts[0].exercises.map(toInput) }]);
      expect(edited.status).toBe(200);
      expect(edited.body.plan).toMatchObject({ status: 'published', publishedAt: plan.publishedAt });
      expect(edited.body.plan.workouts[0]).toMatchObject({ id: plan.workouts[0].id, title: 'Renamed' });
      // Edits do not notify again.
      expect(await waitForNotifications(trainee.id, 1)).toHaveLength(1);
    });
  });

  describe('interval exercises (Phase 8)', () => {
    const circuit = (secondInterval: boolean) => [
      {
        title: 'HIIT',
        exercises: [
          { exerciseId: plank, sets: 8, durationSec: 20, restSec: 10, supersetGroup: 'A', interval: true },
          { exerciseId: curl, sets: 8, durationSec: 20, restSec: 10, supersetGroup: 'A', interval: secondInterval },
        ],
      },
    ];

    it('stores the flag on a timed exercise and keeps it when the plan is duplicated', async () => {
      const draft = await createDraft();
      const res = await savePlan(draft.id, [
        { title: 'Tabata', exercises: [{ exerciseId: plank, sets: 8, durationSec: 20, restSec: 10, interval: true }] },
      ]);
      expect(res.status).toBe(200);
      expect(res.body.plan.workouts[0].exercises[0]).toMatchObject({ interval: true, sets: 8, durationSec: 20, restSec: 10 });

      const copy = await api.request('POST', plansPath(), {
        token: coach.token,
        body: { weekStartDate: NEXT_WEEK, duplicatePrevious: true },
      });
      expect(copy.body.plan.workouts[0].exercises[0].interval).toBe(true);
    });

    it('refuses Interval on an exercise with reps, next to that exercise', async () => {
      const draft = await createDraft();
      const res = await savePlan(draft.id, [
        { title: 'Mixed', exercises: [{ exerciseId: squat, sets: 3, reps: 10, durationSec: 30, interval: true }] },
      ]);
      expect(res.status).toBe(400);
      expect(res.body.issues[0]).toMatchObject({ workoutIndex: 0, exerciseIndex: 0 });
      expect(res.body.issues[0].message).toContain('interval');

      const notBoolean = await savePlan(draft.id, [
        { title: 'Bad', exercises: [{ exerciseId: plank, sets: 3, durationSec: 30, interval: 'yes' }] },
      ]);
      expect(notBoolean.status).toBe(400);
    });

    it('a superset is interval as a whole or not at all (publish rule)', async () => {
      expect(findPublishIssues([{ exercises: [{ supersetGroup: 'A', interval: true }, { supersetGroup: 'A' }] }])[0]).toMatchObject({
        workoutIndex: 0,
        exerciseIndex: 1,
      });

      const draft = await createDraft();
      // A draft may be mid-edit; publishing is where the rule applies.
      expect((await savePlan(draft.id, circuit(false))).status).toBe(200);
      const refused = await api.request('POST', `${plansPath()}/${draft.id}/publish`, { token: coach.token });
      expect(refused.status).toBe(400);

      expect((await savePlan(draft.id, circuit(true))).status).toBe(200);
      const published = await api.request('POST', `${plansPath()}/${draft.id}/publish`, { token: coach.token });
      expect(published.status).toBe(200);

      const mine = await api.request('GET', `/plans/${draft.id}`, { token: trainee.token });
      expect(mine.body.plan.workouts[0].exercises.map((e: { interval?: boolean }) => e.interval)).toEqual([true, true]);
    });
  });

  describe('plan list progress (the Plans tab)', () => {
    it("published plans carry each workout's status; drafts carry none", async () => {
      const plan = await createPublishedPlan();
      await createDraft(NEXT_WEEK);
      // A plan of a week that is over, never touched: every workout is missed.
      await Plan.create({
        traineeId: trainee.user._id,
        coachId: coach.user._id,
        weekStartDate: addDays(THIS_WEEK, -7),
        status: 'published',
        publishedAt: new Date(),
        workouts: [{ title: 'Old', order: 0, exercises: [{ exerciseId: plank, sets: 3, durationSec: 45 }] }],
      });
      await WorkoutLog.create({
        traineeId: trainee.user._id,
        planId: plan.id,
        workoutId: plan.workouts[0].id,
        workoutTitle: plan.workouts[0].title,
        status: 'completed',
        finishedAt: new Date(),
        sets: [],
      });

      const res = await api.request('GET', plansPath(), { token: coach.token });
      expect(res.status).toBe(200);
      const byWeek = new Map(res.body.items.map((item: CoachPlanItem) => [item.weekStartDate, item]));
      const current = byWeek.get(THIS_WEEK) as CoachPlanItem;
      expect(current.progress).toMatchObject({ completed: 1, planned: 2 });
      expect(current.progress!.statuses[plan.workouts[0].id]).toBe('done');
      // No day: it stays open until the week ends.
      expect(current.progress!.statuses[plan.workouts[1].id]).toBe('upcoming');
      expect((byWeek.get(NEXT_WEEK) as CoachPlanItem).progress).toBeUndefined();
      const past = byWeek.get(addDays(THIS_WEEK, -7)) as CoachPlanItem;
      expect(Object.values(past.progress!.statuses)).toEqual(['missed']);
    });
  });

  describe('unpublish / delete', () => {
    it("unpublishing returns the trainee to 'waiting' when it was her only published plan", async () => {
      const plan = await createPublishedPlan();
      const res = await api.request('POST', `${plansPath()}/${plan.id}/unpublish`, { token: coach.token });
      expect(res.status).toBe(200);
      expect(res.body.plan).toMatchObject({ status: 'draft', publishedAt: null });

      const me = await api.request('GET', '/auth/me', { token: trainee.token });
      expect(me.body.user.appState).toBe('waiting');
      const mine = await api.request('GET', `/plans/${plan.id}`, { token: trainee.token });
      expect(mine.status).toBe(404);
    });

    it("she stays on 'home' when another published plan remains", async () => {
      await createPublishedPlan(THIS_WEEK);
      const next = await createPublishedPlan(NEXT_WEEK);
      await api.request('DELETE', `${plansPath()}/${next.id}`, { token: coach.token });
      const me = await api.request('GET', '/auth/me', { token: trainee.token });
      expect(me.body.user.appState).toBe('home');
    });

    it('a draft and an unstarted published plan can be deleted', async () => {
      const draft = await createDraft(NEXT_WEEK);
      expect((await api.request('DELETE', `${plansPath()}/${draft.id}`, { token: coach.token })).status).toBe(204);
      const plan = await createPublishedPlan();
      expect((await api.request('DELETE', `${plansPath()}/${plan.id}`, { token: coach.token })).status).toBe(204);
      expect(await Plan.countDocuments()).toBe(0);
    });

    it('once the trainee started a workout the plan is locked: no unpublish, no delete, edits allowed', async () => {
      const plan = await createPublishedPlan();
      await WorkoutLog.create({
        traineeId: trainee.user._id,
        planId: plan.id,
        workoutId: plan.workouts[0].id,
        workoutTitle: plan.workouts[0].title,
      });

      const read = await api.request('GET', `${plansPath()}/${plan.id}`, { token: coach.token });
      expect(read.body.plan.locked).toBe(true);
      expect((await api.request('POST', `${plansPath()}/${plan.id}/unpublish`, { token: coach.token })).status).toBe(409);
      expect((await api.request('DELETE', `${plansPath()}/${plan.id}`, { token: coach.token })).status).toBe(409);
      expect((await Plan.findById(plan.id))!.status).toBe('published');

      const edit = await savePlan(plan.id, plan.workouts.map((workout: PlanWorkoutBody) => ({ ...toWorkoutInput(workout), title: 'Edited' })));
      expect(edit.status).toBe(200);
      expect(edit.body.plan.workouts[0].id).toBe(plan.workouts[0].id);
    });

    it('deleting a logged workout keeps her log, and putting it back ("Undo") keeps its ids', async () => {
      const plan = await createPublishedPlan();
      const [lower, core] = plan.workouts;
      await WorkoutLog.create({
        traineeId: trainee.user._id,
        planId: plan.id,
        workoutId: lower.id,
        workoutTitle: lower.title,
        status: 'completed',
        finishedAt: new Date(),
        sets: [{ exerciseId: squat, planExerciseId: lower.exercises[0].id, setIndex: 0, reps: 8, completed: true }],
      });

      const removed = await savePlan(plan.id, [toWorkoutInput(core)]);
      expect(removed.status).toBe(200);
      expect(removed.body.plan.workouts.map((workout: { id: string }) => workout.id)).toEqual([core.id]);
      // No cascade: the log and its copied title stay.
      const log = await WorkoutLog.findOne({ planId: plan.id }).lean();
      expect(log).toMatchObject({ workoutTitle: lower.title });

      const restored = await savePlan(plan.id, [toWorkoutInput(lower), toWorkoutInput(core)]);
      expect(restored.status).toBe(200);
      expect(restored.body.plan.workouts[0].id).toBe(lower.id);
      expect(restored.body.plan.workouts[0].exercises[0].id).toBe(lower.exercises[0].id);
      // An id this plan never had is never kept.
      const foreign = await savePlan(plan.id, [{ ...toWorkoutInput(lower), id: new Types.ObjectId().toString() }, toWorkoutInput(core)]);
      expect(foreign.body.plan.workouts[0].id).not.toBe(lower.id);
    });
  });

  describe('trainee status', () => {
    const plan = (weekStartDate: string, status: 'draft' | 'published') => ({ weekStartDate, status });

    it('resolveTraineeStatus follows the owner definitions', () => {
      const base = { onboardingCompleted: true, currentWeek: THIS_WEEK };
      expect(resolveTraineeStatus({ ...base, onboardingCompleted: false, plans: [] }).status).toBe('new');
      expect(resolveTraineeStatus({ ...base, plans: [plan(THIS_WEEK, 'draft')] }).status).toBe('waiting');
      expect(resolveTraineeStatus({ ...base, plans: [plan(addDays(THIS_WEEK, -7), 'published')] })).toEqual({
        status: 'inactive',
        needsNextWeekPlan: false,
      });
      expect(resolveTraineeStatus({ ...base, plans: [plan(THIS_WEEK, 'published')] })).toEqual({
        status: 'active',
        needsNextWeekPlan: true,
      });
      // A draft for next week is enough: the coach is already on it.
      expect(resolveTraineeStatus({ ...base, plans: [plan(THIS_WEEK, 'published'), plan(NEXT_WEEK, 'draft')] })).toEqual({
        status: 'active',
        needsNextWeekPlan: false,
      });
      expect(resolveTraineeStatus({ ...base, plans: [plan(NEXT_WEEK, 'published')] })).toEqual({
        status: 'active',
        needsNextWeekPlan: false,
      });
    });

    it('the trainees list carries status, the 48h deadline and last activity', async () => {
      const fresh = await createTestUser('new@example.com', { coachId: coach.user._id });
      const waiting = await api.request('GET', '/coach/trainees', { token: coach.token });
      expect(waiting.status).toBe(200);
      expect(typeof waiting.body.serverTime).toBe('string');
      const byId = (body: { items: { id: string }[] }, id: string) => body.items.find((item) => item.id === id);

      expect(byId(waiting.body, fresh.id)).toMatchObject({ status: 'new', planDueAt: null });
      const due = new Date(trainee.user.onboardingCompletedAt!.getTime() + 48 * 60 * 60 * 1000).toISOString();
      expect(byId(waiting.body, trainee.id)).toMatchObject({
        status: 'waiting',
        planDueAt: due,
        needsNextWeekPlan: false,
        lastActivityAt: null,
        currentWeekStart: THIS_WEEK,
      });

      const published = await createPublishedPlan();
      const startedAt = new Date('2026-10-01T08:00:00.000Z');
      await WorkoutLog.create({
        traineeId: trainee.user._id,
        planId: published.id,
        workoutId: published.workouts[0].id,
        workoutTitle: 'Lower body',
        startedAt,
      });
      const active = await api.request('GET', `/coach/trainees/${trainee.id}`, { token: coach.token });
      expect(active.body.trainee).toMatchObject({
        status: 'active',
        planDueAt: null,
        needsNextWeekPlan: true,
        lastActivityAt: startedAt.toISOString(),
      });
    });
  });
});

interface PlanExerciseBody {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
  notes?: string;
  supersetGroup?: string;
  interval?: boolean;
}

interface PlanWorkoutBody {
  id: string;
  title: string;
  dayOfWeek?: number;
  exercises: PlanExerciseBody[];
}

/** A plan exercise from a response, as the builder sends it back. */
function toInput({ id, exerciseId, sets, reps, repsMax, durationSec, targetWeight, restSec, notes, supersetGroup, interval }: PlanExerciseBody) {
  return { id, exerciseId, sets, reps, repsMax, durationSec, targetWeight, restSec, notes, supersetGroup, interval };
}

function toWorkoutInput(workout: PlanWorkoutBody) {
  return { id: workout.id, title: workout.title, dayOfWeek: workout.dayOfWeek, exercises: workout.exercises.map(toInput) };
}
