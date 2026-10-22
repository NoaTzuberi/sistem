import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Coaching } from '../../coachings/coaching.model';
import { User } from '../../users/user.model';
import { OnboardingResponse } from '../onboardingResponse.model';
import { migrateLegacyNutritionPreferences } from '../nutritionPreferencesMigration';
import { Plan } from '../../plans/plan.model';
import { BodyMetric } from '../../bodyMetrics/bodyMetric.model';
import { localDateString } from '../../plans/planWeek';
import { appEvents } from '../../../events/appEvents';
import type { TraineeOnboardedEvent } from '../../../events/appEvents';

const FULL_PAYLOAD = {
  name: 'Maya',
  birthDate: '1995-04-12',
  height: 165,
  weight: 60,
  gender: 'female',
  units: { weight: 'kg', distance: 'km' },
  goals: ['build_muscle'],
  trainingFrequency: { minDays: 3, maxDays: 4, flexibleSchedule: true },
  preferredActivities: ['gym_strength_training'],
  exercisePreferences: { favoriteExerciseNotes: 'Squats', muscleFocus: ['glutes'] },
  equipment: ['full_gym'],
  recovery: { flags: ['nothing_to_add'] },
};

let api: ApiTestClient;
let trainee: Awaited<ReturnType<typeof createTestUser>>;

/** She joined a coach (as through an invite link) — onboarding then leads to waiting, not "no coach". */
async function joinCoach(email = 'joined-coach@example.com') {
  const coach = await createTestUser(email, { role: 'coach' });
  await Coaching.create({ traineeId: trainee.user._id, coachId: coach.user._id });
  return coach;
}

describe('onboarding (OnboardingResponse)', () => {
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
    trainee = await createTestUser('maya@example.com');
  });

  it('starts empty', async () => {
    const res = await api.request('GET', '/onboarding', { token: trainee.token });
    expect(res.status).toBe(200);
    expect(res.body.onboarding).toMatchObject({ status: 'not_started', lastStep: null, answers: null });
  });

  it('saves one step, records it, and moves the status to in_progress', async () => {
    const res = await api.request('PATCH', '/onboarding', {
      token: trainee.token,
      body: {
        step: 'basic_profile',
        answers: { name: 'Maya T', birthDate: '1995-04-12', height: 165, weight: 60, units: { weight: 'kg', distance: 'km' } },
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Maya T', onboardingStatus: 'in_progress', appState: 'choose_path' });
    expect(res.body.onboarding).toMatchObject({ lastStep: 'basic_profile', units: { weight: 'kg', distance: 'km' } });

    const stored = await OnboardingResponse.findOne({ userId: trainee.user._id }).lean();
    expect(stored?.answers.height).toBe(165);
    expect(stored?.answers.birthDate).toBeInstanceOf(Date);
  });

  it('merges steps instead of replacing earlier answers', async () => {
    await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'goals', answers: { goals: ['build_muscle'] } } });
    await api.request('PATCH', '/onboarding', {
      token: trainee.token,
      body: { step: 'equipment', answers: { equipment: ['dumbbells'] } },
    });
    const res = await api.request('GET', '/onboarding', { token: trainee.token });
    expect(res.body.onboarding.answers).toMatchObject({ goals: ['build_muscle'], equipment: ['dumbbells'] });
    expect(res.body.onboarding.lastStep).toBe('equipment');
  });

  it('rejects a field that belongs to another step', async () => {
    const res = await api.request('PATCH', '/onboarding', {
      token: trainee.token,
      body: { step: 'goals', answers: { equipment: ['dumbbells'] } },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not part of the goals step/);
  });

  it('rejects invalid values with the existing messages', async () => {
    const res = await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'goals', answers: { goals: [] } } });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Goals must include at least one valid goal.');
  });

  it('rejects an unknown step', async () => {
    const res = await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'nope', answers: {} } });
    expect(res.status).toBe(400);
  });

  it('without a coach, completing lands on Home (self-guided)', async () => {
    const res = await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
    expect(res.status).toBe(200);
    expect(res.body.user.appState).toBe('home');
    expect(res.body.user.coachingStatus).toBeNull();
  });

  it('completes with server time and lands on waiting', async () => {
    await joinCoach();
    const before = Date.now();
    const res = await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ onboardingStatus: 'completed', onboardingCompleted: true, appState: 'waiting' });
    expect(new Date(res.body.user.onboardingCompletedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(res.body.onboarding.completedAt).not.toBeNull();
  });

  it('requires every required answer to complete', async () => {
    const { equipment: _equipment, ...withoutEquipment } = FULL_PAYLOAD;
    const res = await api.request('POST', '/onboarding/complete', { token: trainee.token, body: withoutEquipment });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Equipment must include at least one valid option.');
  });

  it('never restarts the 48h window: re-completing and editing a step keep the first completion time', async () => {
    await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
    const first = (await User.findById(trainee.id).lean())!.onboardingCompletedAt!.getTime();

    await api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: 'goals', answers: { goals: ['lose_weight'] } } });
    await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });

    const user = (await User.findById(trainee.id).lean())!;
    expect(user.onboardingStatus).toBe('completed');
    expect(user.onboardingCompletedAt!.getTime()).toBe(first);
  });

  it("fires 'trainee.onboarded' once, on the first completion only", async () => {
    const coachUser = await createTestUser('event-coach@example.com', { role: 'coach' });
    await Coaching.create({ traineeId: trainee.user._id, coachId: coachUser.user._id });
    const listener = vi.fn<(event: TraineeOnboardedEvent) => void>();
    appEvents.on('trainee.onboarded', listener);
    try {
      await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
      await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
    } finally {
      appEvents.off('trainee.onboarded', listener);
    }

    expect(listener).toHaveBeenCalledTimes(1);
    const user = (await User.findById(trainee.id).lean())!;
    const coaching = (await Coaching.findOne({ traineeId: trainee.id }).lean())!;
    expect(listener.mock.calls[0][0]).toEqual({
      traineeId: trainee.id,
      coachId: String(coaching.coachId),
      coachingId: String(coaching._id),
      completedAt: user.onboardingCompletedAt,
    });
  });

  it('a failing listener never fails the completion', async () => {
    const failing = () => {
      throw new Error('boom');
    };
    await joinCoach();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    appEvents.on('trainee.onboarded', failing);
    try {
      const res = await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
      expect(res.status).toBe(200);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      appEvents.off('trainee.onboarded', failing);
      errorSpy.mockRestore();
    }
  });

  describe('GET /onboarding/waiting', () => {
    it('has no deadline before onboarding is finished', async () => {
      const res = await api.request('GET', '/onboarding/waiting', { token: trainee.token });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ appState: 'choose_path', planDueAt: null });
    });

    it('returns server time and a deadline 48h after the completion time', async () => {
      await joinCoach();
      await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
      const before = Date.now();
      const res = await api.request('GET', '/onboarding/waiting', { token: trainee.token });
      const after = Date.now();

      const user = (await User.findById(trainee.id).lean())!;
      expect(res.body.appState).toBe('waiting');
      expect(new Date(res.body.planDueAt).getTime()).toBe(user.onboardingCompletedAt!.getTime() + 48 * 60 * 60 * 1000);
      const serverTime = new Date(res.body.serverTime).getTime();
      expect(serverTime).toBeGreaterThanOrEqual(before);
      expect(serverTime).toBeLessThanOrEqual(after);
    });

    it('moves to home once a plan is published', async () => {
      const coach = await joinCoach();
      await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
      await Plan.create({
        traineeId: trainee.id,
        coachId: coach.id,
        weekStartDate: '2026-09-27',
        status: 'published',
        publishedAt: new Date(),
        workouts: [],
      });

      const res = await api.request('GET', '/onboarding/waiting', { token: trainee.token });
      expect(res.body.appState).toBe('home');
    });

    it('is trainee-only and needs a session', async () => {
      const coach = await createTestUser('coach@example.com', { role: 'coach' });
      expect((await api.request('GET', '/onboarding/waiting', { token: coach.token })).status).toBe(403);
      expect((await api.request('GET', '/onboarding/waiting')).status).toBe(401);
    });
  });

  it('GET /users/profile keeps the ATLAS response shape for the Profile page', async () => {
    await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
    const res = await api.request('GET', '/users/profile', { token: trainee.token });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      name: 'Maya',
      onboardingCompleted: true,
      profile: { height: 165, goals: ['build_muscle'], equipment: ['full_gym'] },
      preferences: { units: { weight: 'kg', distance: 'km' } },
    });
  });

  it('the old PUT /users/profile is gone', async () => {
    const res = await api.request('PUT', '/users/profile', { token: trainee.token, body: FULL_PAYLOAD });
    expect(res.status).toBe(404);
  });
  // Phase 10: the weight is typed in her chosen unit and stored in kg (it used to be
  // stored as typed); the onboarding weight becomes her first weigh-in, once.
  describe('units and the first weigh-in', () => {
    const basicProfile = (weight: number, unit: 'kg' | 'lb') => ({
      step: 'basic_profile',
      answers: { name: 'Maya', birthDate: '1995-04-12', height: 165, weight, units: { weight: unit, distance: 'km' } },
    });

    it('stores a weight typed in lb as kg; the height (always cm) as typed', async () => {
      const res = await api.request('PATCH', '/onboarding', { token: trainee.token, body: basicProfile(140, 'lb') });
      expect(res.status).toBe(200);
      expect(res.body.onboarding.answers).toMatchObject({ weight: 63.5, height: 165 });
      expect(res.body.onboarding.units).toMatchObject({ weight: 'lb' });
    });

    it('a weight in kg is stored as typed', async () => {
      const res = await api.request('PATCH', '/onboarding', { token: trainee.token, body: basicProfile(60.5, 'kg') });
      expect(res.body.onboarding.answers.weight).toBe(60.5);
    });

    it('the final submit converts lb the same way', async () => {
      const res = await api.request('POST', '/onboarding/complete', {
        token: trainee.token,
        body: { ...FULL_PAYLOAD, weight: 150, units: { weight: 'lb', distance: 'miles' } },
      });
      expect(res.status).toBe(200);
      expect(res.body.onboarding.answers.weight).toBe(68.04);
    });

    // The limits apply to the stored kg value: 20–400 kg, so about 44.1–881.8 lb.
    it.each([
      [450, 'lb', 204.12],
      [881.8, 'lb', 399.98],
      [44.1, 'lb', 20],
      [400, 'kg', 400],
      [20, 'kg', 20],
    ] as const)('accepts %s %s (stored as %s kg)', async (weight, unit, storedKg) => {
      const res = await api.request('PATCH', '/onboarding', { token: trainee.token, body: basicProfile(weight, unit) });
      expect(res.status).toBe(200);
      expect(res.body.onboarding.answers.weight).toBe(storedKg);
    });

    it.each([
      [881.9, 'lb', 'Weight must be a number between 44.1 and 881.8 lb.'],
      [40, 'lb', 'Weight must be a number between 44.1 and 881.8 lb.'],
      [401, 'kg', 'Weight must be a number between 20 and 400.'],
      [19, 'kg', 'Weight must be a number between 20 and 400.'],
    ] as const)('rejects %s %s with a message in that unit', async (weight, unit, message) => {
      const res = await api.request('PATCH', '/onboarding', { token: trainee.token, body: basicProfile(weight, unit) });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(message);
    });

    it('a weight saved without units is checked and converted in the unit she chose before', async () => {
      await api.request('PATCH', '/onboarding', { token: trainee.token, body: basicProfile(140, 'lb') });
      const accepted = await api.request('PATCH', '/onboarding', {
        token: trainee.token,
        body: { step: 'basic_profile', answers: { weight: 450 } },
      });
      expect(accepted.status).toBe(200);
      expect(accepted.body.onboarding.answers.weight).toBe(204.12);
      const rejected = await api.request('PATCH', '/onboarding', {
        token: trainee.token,
        body: { step: 'basic_profile', answers: { weight: 900 } },
      });
      expect(rejected.status).toBe(400);
    });

    it('the final submit uses the same kg limits', async () => {
      const lb = { ...FULL_PAYLOAD, units: { weight: 'lb', distance: 'km' } };
      expect((await api.request('POST', '/onboarding/complete', { token: trainee.token, body: { ...lb, weight: 900 } })).status).toBe(400);
      expect((await api.request('POST', '/onboarding/complete', { token: trainee.token, body: { ...lb, weight: 450 } })).status).toBe(200);
    });

    it('height stays in cm whatever the weight unit (50–300)', async () => {
      const res = await api.request('PATCH', '/onboarding', {
        token: trainee.token,
        body: { step: 'basic_profile', answers: { height: 301, units: { weight: 'lb', distance: 'miles' } } },
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Height must be a number between 50 and 300.');
    });

    it('saving onboarding units keeps the length unit chosen in Settings', async () => {
      await api.request('PATCH', '/users/preferences', { token: trainee.token, body: { units: { length: 'in' } } });
      const res = await api.request('PATCH', '/onboarding', { token: trainee.token, body: basicProfile(140, 'lb') });
      expect(res.body.user.units).toEqual({ weight: 'lb', length: 'in' });
    });

    it('the first completion records the onboarding weight (kg) as a weigh-in for that day', async () => {
      await api.request('POST', '/onboarding/complete', {
        token: trainee.token,
        body: { ...FULL_PAYLOAD, weight: 132, units: { weight: 'lb', distance: 'km' } },
      });
      const metrics = await BodyMetric.find({ traineeId: trainee.user._id }).lean();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({ date: localDateString(new Date(), 'Asia/Jerusalem'), weight: 59.87 });
    });

    it('re-completing or editing the weight later never rewrites the weigh-in', async () => {
      await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
      await api.request('POST', '/onboarding/complete', { token: trainee.token, body: { ...FULL_PAYLOAD, weight: 70 } });
      await api.request('PATCH', '/onboarding', { token: trainee.token, body: basicProfile(72, 'kg') });
      const metrics = await BodyMetric.find({ traineeId: trainee.user._id }).lean();
      expect(metrics.map((metric) => metric.weight)).toEqual([60]);
    });

    it('keeps a weight she already logged that day', async () => {
      const today = localDateString(new Date(), 'Asia/Jerusalem');
      await BodyMetric.create({ traineeId: trainee.user._id, date: today, weight: 58 });
      await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
      const metrics = await BodyMetric.find({ traineeId: trainee.user._id }).lean();
      expect(metrics.map((metric) => metric.weight)).toEqual([58]);
    });
  });

  describe('"Nutrition & goal" step (Phase 13a, v2 in 13a+)', () => {
    const PREFERENCES = {
      dietType: 'vegetarian',
      dietTypeDetails: ' eggs ok ',
      dietStyles: [{ id: 'intermittent_fasting', details: '16:8' }, { id: 'other', details: ' Mostly home-cooked ' }],
      religious: [{ id: 'kosher' }],
      intolerances: [{ id: 'lactose_free', details: ' lactose ok in yogurt ' }, { id: 'celiac', details: '' }],
      allergies: [{ id: 'tree_nuts' }, { id: 'tree_nuts' }, { id: 'shellfish' }],
      foodsLoved: ' Hummus ',
      foodsDisliked: '',
      mealsPerDay: 4,
    };
    const step = (answers: Record<string, unknown>, token = trainee.token) =>
      api.request('PATCH', '/onboarding', { token, body: { step: 'nutrition_preferences', answers } });

    it('saves the step (trimmed, de-duplicated, empty details dropped) and resumes after it', async () => {
      const res = await step({ nutritionPreferences: PREFERENCES });
      expect(res.status).toBe(200);
      expect(res.body.onboarding.lastStep).toBe('nutrition_preferences');
      expect(res.body.onboarding.answers.nutritionPreferences).toEqual({
        dietType: 'vegetarian',
        dietTypeDetails: 'eggs ok',
        dietStyles: [{ id: 'intermittent_fasting', details: '16:8' }, { id: 'other', details: 'Mostly home-cooked' }],
        religious: [{ id: 'kosher' }],
        intolerances: [{ id: 'lactose_free', details: 'lactose ok in yogurt' }, { id: 'celiac' }],
        allergies: [{ id: 'tree_nuts' }, { id: 'shellfish' }],
        foodsLoved: 'Hummus',
        mealsPerDay: 4,
      });
    });

    it('validates on the server', async () => {
      const save = (nutritionPreferences: unknown, stepId = 'nutrition_preferences') =>
        api.request('PATCH', '/onboarding', { token: trainee.token, body: { step: stepId, answers: { nutritionPreferences } } });
      expect((await save({ ...PREFERENCES, dietType: 'keto' })).status).toBe(400);
      expect((await save({ ...PREFERENCES, religious: [{ id: 'jain' }] })).status).toBe(400);
      expect((await save({ ...PREFERENCES, allergies: ['tree_nuts'] })).status).toBe(400);
      expect((await save({ ...PREFERENCES, allergies: [{ id: 'other' }] })).status).toBe(400);
      expect((await save({ ...PREFERENCES, intolerances: [{ id: 'celiac', details: 'x'.repeat(301) }] })).status).toBe(400);
      expect((await save({ ...PREFERENCES, foodsDisliked: 'x'.repeat(501) })).status).toBe(400);
      expect((await save({ ...PREFERENCES, mealsPerDay: 9 })).status).toBe(400);
      expect((await save({ ...PREFERENCES, mealsPerDay: null })).status).toBe(200);
      // Only its own step may save it.
      expect((await save(PREFERENCES, 'equipment')).status).toBe(400);
    });

    it('saves the weight goal in kg (typed in her unit) with the moment she set it; null clears it', async () => {
      const first = await step({ weightGoal: { targetWeight: 55, timeframe: { kind: 'weeks', weeks: 12 } } });
      expect(first.status).toBe(200);
      const goal = first.body.onboarding.answers.weightGoal;
      expect(goal).toMatchObject({ targetWeightKg: 55, timeframe: { kind: 'weeks', weeks: 12 } });
      expect(typeof goal.setAt).toBe('string');

      // The same goal again keeps "12 weeks from then"; a new one starts counting now.
      const again = await step({ weightGoal: { targetWeight: 55, timeframe: { kind: 'weeks', weeks: 12 } } });
      expect(again.body.onboarding.answers.weightGoal.setAt).toBe(goal.setAt);

      await User.updateOne({ _id: trainee.user._id }, { $set: { 'preferences.units.weight': 'lb' } });
      const inPounds = await step({ weightGoal: { targetWeight: 132, timeframe: null } });
      expect(inPounds.body.onboarding.answers.weightGoal.targetWeightKg).toBeCloseTo(59.9, 1);

      const cleared = await step({ weightGoal: null });
      expect(cleared.body.onboarding.answers).not.toHaveProperty('weightGoal');
    });

    it('validates the weight goal', async () => {
      const save = (weightGoal: unknown) => step({ weightGoal });
      expect((await save({ targetWeight: 10, timeframe: null })).status).toBe(400);
      expect((await save({ targetWeight: 60, timeframe: { kind: 'weeks', weeks: 0 } })).status).toBe(400);
      expect((await save({ targetWeight: 60, timeframe: { kind: 'weeks', weeks: 200 } })).status).toBe(400);
      expect((await save({ targetWeight: 60, timeframe: { kind: 'date', date: '2001-01-01' } })).status).toBe(400);
      expect((await save({ targetWeight: 60, timeframe: { kind: 'date', date: '2999-01-01' } })).status).toBe(400);
      expect((await save({ targetWeight: 60, timeframe: { kind: 'months', months: 3 } })).status).toBe(400);
      const inAMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      expect((await save({ targetWeight: 60, timeframe: { kind: 'date', date: inAMonth } })).status).toBe(200);
    });

    it('is optional on completion (trainees from before the step are never sent back) and kept when sent', async () => {
      const without = await api.request('POST', '/onboarding/complete', { token: trainee.token, body: FULL_PAYLOAD });
      expect(without.status).toBe(200);
      expect(without.body.onboarding.answers).not.toHaveProperty('nutritionPreferences');

      const withPreferences = await api.request('POST', '/onboarding/complete', {
        token: trainee.token,
        body: { ...FULL_PAYLOAD, nutritionPreferences: { dietType: 'none' } },
      });
      expect(withPreferences.body.onboarding.answers.nutritionPreferences).toEqual({
        dietType: 'none',
        dietStyles: [],
        religious: [],
        intolerances: [],
        allergies: [],
        mealsPerDay: null,
      });
    });

    it('moves 13a answers to the v2 shape once (server start)', async () => {
      await OnboardingResponse.collection.insertOne({
        userId: trainee.user._id,
        answers: {
          goals: [],
          nutritionPreferences: { dietType: 'vegetarian', kosher: true, allergies: ['tree_nuts'], allergyNotes: 'Kiwi', dislikes: 'Mushrooms' },
        },
      });
      expect(await migrateLegacyNutritionPreferences()).toBe(1);
      expect(await migrateLegacyNutritionPreferences()).toBe(0);
      const res = await api.request('GET', '/onboarding', { token: trainee.token });
      expect(res.body.onboarding.answers.nutritionPreferences).toEqual({
        dietType: 'vegetarian',
        dietStyles: [],
        religious: [{ id: 'kosher' }],
        intolerances: [],
        allergies: [{ id: 'tree_nuts' }, { id: 'other', details: 'Kiwi' }],
        foodsDisliked: 'Mushrooms',
        mealsPerDay: null,
      });
    });

    it('her coach sees them with the other answers; another coach does not', async () => {
      const coach = await createTestUser('coach@example.com', { role: 'coach' });
      const otherCoach = await createTestUser('other@example.com', { role: 'coach' });
      await Coaching.create({ traineeId: trainee.user._id, coachId: coach.user._id });
      await step({ nutritionPreferences: PREFERENCES, weightGoal: { targetWeight: 55, timeframe: null } });
      const res = await api.request('GET', `/coach/trainees/${trainee.id}`, { token: coach.token });
      expect(res.body.trainee.onboarding.answers.nutritionPreferences.allergies).toEqual([{ id: 'tree_nuts' }, { id: 'shellfish' }]);
      expect(res.body.trainee.onboarding.answers.weightGoal.targetWeightKg).toBe(55);
      expect((await api.request('GET', `/coach/trainees/${trainee.id}`, { token: otherCoach.token })).status).toBe(404);
    });
  });
});
