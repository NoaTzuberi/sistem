import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Exercise } from '../../exercises/exercise.model';
import { OnboardingResponse } from '../../onboarding/onboardingResponse.model';
import { PersonalRecord } from '../../personalRecords/personalRecord.model';
import { currentWeekStart } from '../../plans/planWeek';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { ExerciseFamily } from '../exerciseFamily.model';
import { regroupLibrary } from '../exerciseFamilyGrouping.service';

// Phase 12b over the API: the slot-filtered family picker (pattern / her equipment / level),
// the coach's library edits surviving a re-run of the grouping, her history per variant, the
// training config, plan workout types / slots, and the onboarding experience answer.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const LIBRARY: [string, string, string, string?][] = [
  ['Barbell Romanian Deadlift', 'hamstrings', 'barbell'],
  ['Dumbbell Romanian Deadlift', 'hamstrings', 'dumbbell'],
  ['FYR2 Barbell Romanian Deadlift', 'lower_back', 'barbell'],
  ['Kettlebell Swing', 'glutes', 'kettlebell'],
  ['Snatch-Grip Deficit Deadlift', 'hamstrings', 'barbell', 'advanced'],
  ['Barbell Back Squat', 'quadriceps', 'barbell'],
  ['Goblet Squat', 'quadriceps', 'dumbbell'],
  ['Barbell Bench Press', 'chest', 'barbell'],
  ['Push-Up', 'chest', 'bodyweight'],
  ['Turkish Get-Up', 'quadriceps', 'kettlebell'],
  ['Squat to Overhead Press to Row', 'quadriceps', 'dumbbell'],
  ['Holman 180 Jump', 'quadriceps', 'bodyweight'],
];

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
const ids = new Map<string, string>();

async function seed() {
  const docs = await Exercise.insertMany(
    LIBRARY.map(([name, muscle, equipment, difficulty], i) => ({
      slug: `exercise-${i}`,
      name,
      primaryMuscles: [muscle],
      equipment: [equipment],
      difficulty: difficulty ?? 'beginner',
      movementType: 'strength',
      source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() },
    })),
  );
  docs.forEach((doc) => ids.set(doc.name, String(doc._id)));
  await regroupLibrary();
}

const families = (query: string, user = coach) => api.request('GET', `/coach/exercise-families?${query}`, { token: user.token });
const names = (body: { items: { name: string }[] }) => body.items.map((item) => item.name).sort();
const familyOf = async (exerciseName: string) => String((await Exercise.findById(ids.get(exerciseName)).lean())!.familyId);

describe('exercise families & training config (Phase 12b)', () => {
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
    ids.clear();
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    otherCoach = await createTestUser('other@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id });
    await OnboardingResponse.create({ userId: trainee.user._id, answers: { equipment: ['dumbbells'], goals: [], preferredActivities: [] } });
    await seed();
  });

  it('groups variants into one family with one primary per variant', async () => {
    const res = await families('search=romanian');
    expect(res.status).toBe(200);
    const rdl = res.body.items.find((item: { name: string }) => item.name === 'Romanian Deadlift');
    expect(rdl).toMatchObject({ patterns: ['hinge'], muscles: ['hamstrings', 'lower_back'], copyCount: 1 });
    expect(rdl.variants.map((variant: { variant: string }) => variant.variant)).toEqual(['barbell', 'dumbbell']);
  });

  it('lists plain names first, number-led and long names after', async () => {
    const all = (await families('limit=50')).body.items.map((item: { name: string }) => item.name);
    expect(all.indexOf('Push-Up')).toBeLessThan(all.indexOf('Goblet Squat'));
    expect(all.indexOf('Goblet Squat')).toBeLessThan(all.indexOf('180 Jump'));
  });

  it('filters by the slot, her equipment and her level', async () => {
    const slot = `workoutType=lower&slotId=hinge&traineeId=${trainee.id}`;
    const hers = await families(slot);
    // Dumbbells at home: barbell-only hinges are out; the Romanian deadlift stays for its dumbbell variant.
    expect(names(hers.body)).toEqual(['Romanian Deadlift']);
    const variants = hers.body.items[0].variants;
    expect(variants.find((variant: { variant: string }) => variant.variant === 'barbell').allowed).toBe(false);
    expect(variants.find((variant: { variant: string }) => variant.variant === 'dumbbell').allowed).toBe(true);

    // "Her equipment only" off: every hinge at her levels (beginner + intermediate) — not the advanced one.
    expect(names((await families(`${slot}&equipmentOnly=false`)).body)).toEqual(['Kettlebell Swing', 'Romanian Deadlift']);
    expect(names((await families(`${slot}&equipmentOnly=false&levels=advanced`)).body)).toEqual(['Snatch-Grip Deficit Deadlift']);

    // Experienced: advanced exercises are offered too.
    await OnboardingResponse.updateOne({ userId: trainee.user._id }, { $set: { 'answers.equipment': ['full_gym'], 'answers.trainingExperience': 'experienced' } });
    expect(names((await families(slot)).body)).toEqual(['Kettlebell Swing', 'Romanian Deadlift', 'Snatch-Grip Deficit Deadlift']);

    // A lower-body slot never offers the bench press; "show all" (no slot) does.
    expect(names((await families('workoutType=lower&slotId=squat')).body)).toEqual(['Barbell Back Squat', 'Goblet Squat']);
    expect((await families('search=bench')).body.items).toHaveLength(1);
    expect((await families('workoutType=lower&slotId=chest')).status).toBe(400);
  });

  it('is coach-only, and only for her own trainees', async () => {
    expect((await families('', trainee)).status).toBe(403);
    expect((await families(`traineeId=${trainee.id}`, otherCoach)).status).toBe(404);
    const familyId = await familyOf('Push-Up');
    expect((await api.request('GET', `/coach/exercise-families/${familyId}?traineeId=${trainee.id}`, { token: otherCoach.token })).status).toBe(404);
  });

  it("keeps the coach's edits when the grouping runs again", async () => {
    const rdl = await familyOf('Barbell Romanian Deadlift');
    const base = `/coach/exercise-families/${rdl}`;
    const renamed = await api.request('PATCH', base, { token: coach.token, body: { name: 'RDL', patterns: ['hinge', 'glute_bridge'], reviewed: true } });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'RDL', source: 'coach', patternSource: 'coach', reviewedAt: expect.any(String) });

    // The FYR2 copy becomes the barbell primary.
    const primary = await api.request('PUT', `${base}/primary`, { token: coach.token, body: { exerciseId: ids.get('FYR2 Barbell Romanian Deadlift') } });
    expect(primary.body.variants.find((variant: { variant: string }) => variant.variant === 'barbell').name).toBe('FYR2 Barbell Romanian Deadlift');

    // Merge the swing in, split the dumbbell RDL out.
    const swing = await familyOf('Kettlebell Swing');
    const merged = await api.request('POST', `${base}/merge`, { token: coach.token, body: { familyId: swing } });
    expect(merged.body.members).toHaveLength(4);
    const split = await api.request('POST', `${base}/split`, { token: coach.token, body: { exerciseIds: [ids.get('Dumbbell Romanian Deadlift')] } });
    expect(split.body.members.map((member: { name: string }) => member.name)).toEqual(['Dumbbell Romanian Deadlift']);
    expect((await api.request('POST', `${base}/split`, { token: coach.token, body: { exerciseIds: [] } })).status).toBe(400);
    expect((await api.request('POST', `${base}/merge`, { token: coach.token, body: { familyId: rdl } })).status).toBe(400);

    await regroupLibrary();

    const after = (await api.request('GET', base, { token: coach.token })).body;
    expect(after).toMatchObject({ name: 'RDL', patterns: ['hinge', 'glute_bridge'], reviewedAt: expect.any(String) });
    expect(after.members.map((member: { name: string }) => member.name).sort()).toEqual([
      'Barbell Romanian Deadlift',
      'FYR2 Barbell Romanian Deadlift',
      'Kettlebell Swing',
    ]);
    expect(after.variants.find((variant: { variant: string }) => variant.variant === 'barbell').name).toBe('FYR2 Barbell Romanian Deadlift');
    expect(await familyOf('Dumbbell Romanian Deadlift')).toBe(split.body.id);
  });

  it('lists the unclear ones for review, and shows her history per variant', async () => {
    const review = await families('review=needed');
    expect(names(review.body)).toEqual(['Squat to Overhead Press to Row', 'Turkish Get-Up']);
    expect(review.body.items.every((item: { reviewReasons: string[] }) => item.reviewReasons.includes('unclear_pattern'))).toBe(true);

    // An unchecked combo (3 patterns) stays out of the slots until the coach marks it reviewed.
    expect(names((await families('workoutType=lower&slotId=squat')).body)).not.toContain('Squat to Overhead Press to Row');
    const combo = await familyOf('Squat to Overhead Press to Row');
    await api.request('PATCH', `/coach/exercise-families/${combo}`, { token: coach.token, body: { reviewed: true } });
    expect(names((await families('workoutType=lower&slotId=squat')).body)).toContain('Squat to Overhead Press to Row');

    const barbell = ids.get('Barbell Romanian Deadlift')!;
    const barbellLog = await WorkoutLog.create({
      traineeId: trainee.user._id,
      planId: new Types.ObjectId(),
      coachingId: trainee.coachingId!,
      workoutId: new Types.ObjectId(),
      workoutTitle: 'Lower',
      status: 'completed',
      finishedAt: new Date('2026-10-01T10:00:00Z'),
      sets: [{ exerciseId: barbell, setIndex: 0, reps: 8, weight: 40, completed: true }],
    });
    await PersonalRecord.create({ userId: trainee.user._id, exerciseId: barbell, logId: barbellLog._id, previousValue: 35, newValue: 40, type: 'weight' });

    const history = await api.request('GET', `/coach/trainees/${trainee.id}/exercise-history?familyId=${await familyOf('Dumbbell Romanian Deadlift')}`, {
      token: coach.token,
    });
    expect(history.status).toBe(200);
    expect(history.body.variants).toEqual([
      expect.objectContaining({
        exerciseId: barbell,
        variant: 'barbell',
        last: expect.objectContaining({ reps: 8, weight: 40 }),
        best: expect.objectContaining({ type: 'weight', value: 40 }),
      }),
    ]);
  });

  it('serves the training config with her overrides, and validates them', async () => {
    const res = await api.request('GET', '/coach/training/config', { token: coach.token });
    expect(res.status).toBe(200);
    expect(res.body.config.splits.find((split: { id: string }) => split.id === 'abc')).toMatchObject({ coachToConfirm: true });
    expect(res.body.config.workoutTypes.map((type: { id: string }) => type.id)).toContain('lower_glute');

    const slots = [{ id: 'glute_bridge', patterns: ['glute_bridge'], required: true, maxExercises: 3 }];
    const saved = await api.request('PUT', '/coach/training/settings', {
      token: coach.token,
      body: { workoutTypes: { lower_glute: { slots } }, splits: { abc: { enabled: false } } },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.config.workoutTypes.find((type: { id: string }) => type.id === 'lower_glute').slots).toEqual(slots);
    expect(saved.body.config.splits.find((split: { id: string }) => split.id === 'abc').enabled).toBe(false);
    // Another coach still has the defaults.
    const other = await api.request('GET', '/coach/training/config', { token: otherCoach.token });
    expect(other.body.config.workoutTypes.find((type: { id: string }) => type.id === 'lower_glute').slots).toHaveLength(6);

    const bad = await api.request('PUT', '/coach/training/settings', {
      token: coach.token,
      body: { workoutTypes: { lower_glute: { slots: [{ ...slots[0], patterns: ['magic'] }] } } },
    });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('training_settings_invalid');
    expect((await api.request('GET', '/coach/training/config', { token: trainee.token })).status).toBe(403);
  });

  it('saves workout types and slots on a plan (coach-only), checked against her config', async () => {
    const plansPath = `/coach/trainees/${trainee.id}/plans`;
    const created = await api.request('POST', plansPath, { token: coach.token, body: { weekStartDate: currentWeekStart('Asia/Jerusalem') } });
    const planPath = `${plansPath}/${created.body.plan.id}`;
    const exercise = (slotId?: string) => ({ exerciseId: ids.get('Barbell Back Squat'), sets: 3, reps: 8, ...(slotId ? { slotId } : {}) });

    const saved = await api.request('PUT', planPath, {
      token: coach.token,
      body: { splitId: 'upper_lower', workouts: [{ title: 'Lower A', workoutType: 'lower', exercises: [exercise('squat'), exercise()] }] },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.plan).toMatchObject({ splitId: 'upper_lower', workouts: [{ workoutType: 'lower' }] });
    expect(saved.body.plan.workouts[0].exercises[0].slotId).toBe('squat');
    expect(saved.body.plan.workouts[0].exercises[1]).not.toHaveProperty('slotId');
    expect(saved.body.plan.workouts[0].exercises[0].exercise.patterns).toEqual(['squat']);

    const refuse = async (body: object, code: string) => {
      const res = await api.request('PUT', planPath, { token: coach.token, body });
      expect(res.status).toBe(400);
      expect(res.body.issues.map((issue: { code: string }) => issue.code)).toContain(code);
    };
    await refuse({ workouts: [{ title: 'X', workoutType: 'bro_day', exercises: [] }] }, 'plan_workout_type_unknown');
    await refuse({ workouts: [{ title: 'X', workoutType: 'lower', exercises: [exercise('chest')] }] }, 'plan_slot_unknown');
    await refuse({ workouts: [{ title: 'X', exercises: [exercise('squat')] }] }, 'plan_slot_needs_type');
    await refuse({ splitId: 'bro_split', workouts: [] }, 'plan_split_unknown');

    // The trainee never sees them.
    await api.request('POST', `${planPath}/publish`, { token: coach.token });
    const hers = await api.request('GET', '/plans', { token: trainee.token });
    expect(JSON.stringify(hers.body)).not.toContain('slotId');
    expect(JSON.stringify(hers.body)).not.toContain('workoutType');
  });

  it('stores the optional experience answer from the frequency step', async () => {
    const save = (trainingExperience: unknown) =>
      api.request('PATCH', '/onboarding', {
        token: trainee.token,
        body: { step: 'frequency', answers: { trainingFrequency: { minDays: 2, maxDays: 3, flexibleSchedule: false }, trainingExperience } },
      });
    expect((await save('some')).body.onboarding.answers.trainingExperience).toBe('some');
    expect((await save('pro')).status).toBe(400);
    expect((await save(null)).body.onboarding.answers).not.toHaveProperty('trainingExperience');
    expect(await ExerciseFamily.countDocuments()).toBeGreaterThan(0);
  });
});
