import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { requireFeature, setFeatureFlagsForTests } from '../../../config/features';
import { Notification } from '../../notifications/notification.model';
import { OnboardingResponse } from '../../onboarding/onboardingResponse.model';
import { BodyMetric } from '../../bodyMetrics/bodyMetric.model';
import { Template } from '../../templates/template.model';
import { FoodItem } from '../foodItem.model';
import { NutritionPlan, NutritionPlanVersion } from '../nutritionPlan.model';

// Phase 13a, through the real API: the coach's food list, numbers, templates and each
// trainee's plan (draft → publish → versions); the trainee's calorie-free view; who may
// call what; the closed 13b features.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
let otherTrainee: TestUser;

const planPath = (traineeId = trainee.id) => `/coach/trainees/${traineeId}/nutrition-plan`;

async function createFood(body: Record<string, unknown>, token = coach.token) {
  const res = await api.request('POST', '/coach/nutrition/foods', { token, body });
  expect(res.status).toBe(201);
  return res.body.item as { id: string; group: string };
}

async function waitForNotifications(userId: string, count: number) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const found = await Notification.find({ userId }).sort({ _id: 1 }).lean();
    if (found.length >= count) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return Notification.find({ userId }).sort({ _id: 1 }).lean();
}

let protein: { id: string };
let carb: { id: string };
let fat: { id: string };

function target(kcal: number | null, confirmBelowFloor = false) {
  return { kcal, source: kcal === null ? null : 'override', goal: 'fat_loss', formulaSex: null, confirmBelowFloor };
}

function breakfast(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Breakfast',
    portions: { protein: 1, carb: 1, fat: 1, snack: 0 },
    vegetablesFree: true,
    options: [
      {
        label: 'Option A',
        lines: [
          { kind: 'food', foodItemId: protein.id, portions: 1 },
          { kind: 'food', foodItemId: carb.id, portions: 1 },
          { kind: 'food', foodItemId: fat.id, portions: 1 },
          { kind: 'text', text: 'Cut vegetables — free', group: 'vegetable' },
        ],
      },
    ],
    ...overrides,
  };
}

async function savePlan(body: Record<string, unknown>, traineeId = trainee.id) {
  return api.request('PUT', planPath(traineeId), { token: coach.token, body: { tips: [], ...body } });
}

async function publish(traineeId = trainee.id) {
  return api.request('POST', `${planPath(traineeId)}/publish`, { token: coach.token });
}

describe('nutrition (API)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    api = await startApiTestClient();
    await Promise.all([NutritionPlanVersion.init(), FoodItem.init(), Notification.init(), Template.init()]);
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    setFeatureFlagsForTests({ nutritionRecipes: false, waterTracking: false });
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    otherCoach = await createTestUser('other-coach@example.com', { role: 'coach' });
    const onboarded = { onboardingStatus: 'completed' as const, onboardingCompletedAt: new Date() };
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, ...onboarded });
    otherTrainee = await createTestUser('dana@example.com', { coachId: otherCoach.user._id, ...onboarded });
    await OnboardingResponse.create({
      userId: trainee.user._id,
      completedAt: new Date(),
      answers: {
        birthDate: new Date('1995-04-12T00:00:00Z'),
        height: 165,
        weight: 70,
        gender: 'female',
        goals: ['lose_weight'],
        trainingFrequency: { minDays: 3, maxDays: 4, flexibleSchedule: false },
        preferredActivities: ['running'],
        equipment: ['full_gym'],
        nutritionPreferences: {
          dietType: 'vegetarian',
          dietStyles: [],
          religious: [{ id: 'kosher' }],
          intolerances: [],
          allergies: [{ id: 'tree_nuts' }],
          foodsDisliked: 'Mushrooms',
          mealsPerDay: null,
        },
      },
    });
    protein = await createFood({ group: 'protein', name: 'Chicken breast', portion: '130 g', grams: 130, dietTags: ['poultry'] });
    carb = await createFood({ group: 'carb', name: 'Light bread', portion: '3 slices', dietTags: ['gluten'] });
    fat = await createFood({ group: 'fat', name: 'Almonds', portion: '10 pcs', dietTags: ['tree_nuts'], isNew: true, kcal: 85 });
  });

  afterEach(() => setFeatureFlagsForTests(null));

  describe('authorization', () => {
    it('a trainee cannot use any coach nutrition route (403)', async () => {
      const calls: [string, string][] = [
        ['GET', '/coach/nutrition/foods'],
        ['POST', '/coach/nutrition/foods'],
        ['PATCH', `/coach/nutrition/foods/${protein.id}`],
        ['DELETE', `/coach/nutrition/foods/${protein.id}`],
        ['GET', '/coach/nutrition/settings'],
        ['PUT', '/coach/nutrition/settings'],
        ['POST', '/coach/nutrition/settings/preview'],
        ['GET', '/coach/nutrition/templates'],
        ['GET', planPath()],
        ['PUT', planPath()],
        ['GET', `${planPath()}/suggestion`],
        ['POST', `${planPath()}/publish`],
        ['POST', `${planPath()}/from-template`],
        ['POST', `${planPath()}/template`],
      ];
      for (const [method, path] of calls) {
        expect((await api.request(method, path, { token: trainee.token, body: method === 'GET' ? undefined : {} })).status).toBe(403);
      }
    });

    it("another coach can't see or touch this coach's trainee or food items (404)", async () => {
      expect((await api.request('GET', planPath(), { token: otherCoach.token })).status).toBe(404);
      expect((await savePlan({ calorieTarget: target(1500), meals: [] }, trainee.id).then(() =>
        api.request('POST', `${planPath()}/publish`, { token: otherCoach.token }))).status).toBe(404);
      expect((await api.request('PATCH', `/coach/nutrition/foods/${protein.id}`, { token: otherCoach.token, body: { name: 'X' } })).status).toBe(404);
      expect((await api.request('DELETE', `/coach/nutrition/foods/${protein.id}`, { token: otherCoach.token })).status).toBe(404);
      const list = await api.request('GET', '/coach/nutrition/foods', { token: otherCoach.token });
      expect(list.body.items).toEqual([]);
    });

    it("a plan can't use another coach's food item", async () => {
      const theirs = await createFood({ group: 'protein', name: 'Theirs', portion: '1' }, otherCoach.token);
      const res = await savePlan({
        calorieTarget: target(1500),
        meals: [breakfast({ options: [{ label: 'A', lines: [{ kind: 'food', foodItemId: theirs.id, portions: 1 }] }] })],
      });
      expect(res.status).toBe(400);
      expect(res.body.issues[0]).toMatchObject({ code: 'food_missing', mealIndex: 0, optionIndex: 0, lineIndex: 0 });
    });

    it('the trainee reads only her own published plan; a coach cannot use the trainee route', async () => {
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      expect((await publish()).status).toBe(200);
      expect((await api.request('GET', '/nutrition-plan', { token: otherTrainee.token })).body.plan).toBeNull();
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.version).toBe(1);
      expect((await api.request('GET', '/nutrition-plan', { token: coach.token })).status).toBe(403);
    });
  });

  describe('food list', () => {
    it("refuses kcal above the group's value", async () => {
      const res = await api.request('POST', '/coach/nutrition/foods', {
        token: coach.token,
        body: { group: 'fat', name: 'Oil', portion: '2 tsp', kcal: 95 },
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/90/);
      const moved = await api.request('PATCH', `/coach/nutrition/foods/${fat.id}`, { token: coach.token, body: { group: 'vegetable' } });
      expect(moved.status).toBe(400);
    });

    it('deletes an unused item; archives a used one (it keeps resolving) and can restore it', async () => {
      const unused = await createFood({ group: 'carb', name: 'Rice', portion: '85 g' });
      expect((await api.request('DELETE', `/coach/nutrition/foods/${unused.id}`, { token: coach.token })).body.outcome).toBe('deleted');

      await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      const archived = await api.request('DELETE', `/coach/nutrition/foods/${protein.id}`, { token: coach.token });
      expect(archived.body).toMatchObject({ outcome: 'archived', item: { id: protein.id } });
      expect(archived.body.item.archivedAt).not.toBeNull();

      const plan = await api.request('GET', planPath(), { token: coach.token });
      expect(plan.body.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'food_archived', severity: 'error' })]));

      const restored = await api.request('POST', `/coach/nutrition/foods/${protein.id}/restore`, { token: coach.token });
      expect(restored.body.item.archivedAt).toBeNull();
    });
  });

  describe('settings', () => {
    const settings = {
      groupKcal: { protein: 140, carb: 120, fat: 90, snack: 150 },
      goalAdjustments: { fat_loss: -15, fat_loss_aggressive: -25, recomp: -10, muscle_gain: 10, maintenance: 0 },
      activityFactors: [1.375, 1.375, 1.55, 1.55, 1.55, 1.725, 1.725],
      floorKcal: 1300,
      kcalPerKg: 7700,
      maxLossRatePctPerWeek: 1,
      maxGainRatePctPerWeek: 0.5,
      maxDeficitPct: 25,
      portionSplit: { protein: 45, carb: 32, fat: 23, snack: 0 },
      ketoMaxCarbPortions: 1,
    };

    it('starts from the defaults and saves her own numbers (vegetables stay free)', async () => {
      const initial = await api.request('GET', '/coach/nutrition/settings', { token: coach.token });
      expect(initial.body.config.floorKcal).toBe(1200);
      const saved = await api.request('PUT', '/coach/nutrition/settings', { token: coach.token, body: settings });
      expect(saved.status).toBe(200);
      expect(saved.body.config.groupKcal).toEqual({ protein: 140, carb: 120, fat: 90, snack: 150, vegetable: 0 });
      expect(saved.body.defaults.floorKcal).toBe(1200);
      // Another coach still has the defaults.
      expect((await api.request('GET', '/coach/nutrition/settings', { token: otherCoach.token })).body.config.floorKcal).toBe(1200);
    });

    it('refuses a group value below a food item that has kcal', async () => {
      const res = await api.request('PUT', '/coach/nutrition/settings', {
        token: coach.token,
        body: { ...settings, groupKcal: { protein: 150, carb: 120, fat: 80, snack: 150 } },
      });
      expect(res.status).toBe(409);
    });

    it('previews unsaved numbers on the example trainee with the real calculation (nothing stored)', async () => {
      const res = await api.request('POST', '/coach/nutrition/settings/preview', { token: coach.token, body: settings });
      expect(res.status).toBe(200);
      // 60 kg · 165 cm · 30 · female: BMR 1320.25 × 1.55 = 2046.4 → recomp −10% → 1840 kcal.
      expect(res.body).toMatchObject({ status: 'ok', bmr: 1320, tdee: 2046, kcal: 1840, inputs: { goal: 'recomp', trainingDays: 3 } });
      expect(res.body.portions.protein).toBeGreaterThan(0);

      const floorAboveTdee = await api.request('POST', '/coach/nutrition/settings/preview', {
        token: coach.token,
        body: { ...settings, floorKcal: 2100 },
      });
      expect(floorAboveTdee.body).toMatchObject({ kcal: 2100, raisedToFloor: true });
      expect((await api.request('GET', '/coach/nutrition/settings', { token: coach.token })).body.config.floorKcal).toBe(1200);

      const invalid = await api.request('POST', '/coach/nutrition/settings/preview', { token: coach.token, body: { ...settings, floorKcal: 500 } });
      expect(invalid.status).toBe(400);
    });
  });

  describe('calorie suggestion', () => {
    it('uses her latest weigh-in over the onboarding weight, with every input', async () => {
      const fromOnboarding = await api.request('GET', `${planPath()}/suggestion`, { token: coach.token });
      expect(fromOnboarding.body.inputs).toMatchObject({ weightKg: 70, weightSource: 'onboarding', goal: 'fat_loss', goalSource: 'onboarding' });

      await BodyMetric.create({ traineeId: trainee.user._id, date: '2026-09-01', weight: 69 });
      await BodyMetric.create({ traineeId: trainee.user._id, date: '2026-10-01', weight: 68 });
      await BodyMetric.create({ traineeId: trainee.user._id, date: '2026-10-05' });
      const res = await api.request('GET', `${planPath()}/suggestion?goal=maintenance`, { token: coach.token });
      expect(res.body).toMatchObject({
        status: 'ok',
        inputs: { weightKg: 68, weightSource: 'weigh_in', weightDate: '2026-10-01', goal: 'maintenance', goalSource: 'coach', adjustmentPct: 0 },
      });
      expect((await api.request('GET', `${planPath()}/suggestion?goal=bulk`, { token: coach.token })).status).toBe(400);
    });

    it('sex "other": needs the coach to pick a formula', async () => {
      await OnboardingResponse.updateOne({ userId: trainee.user._id }, { $set: { 'answers.gender': 'other' } });
      const res = await api.request('GET', `${planPath()}/suggestion`, { token: coach.token });
      expect(res.body).toMatchObject({ status: 'needs_formula', kcal: null });
      const picked = await api.request('GET', `${planPath()}/suggestion?formula=female`, { token: coach.token });
      expect(picked.body.status).toBe('ok');
    });
  });

  describe('builder, publish and versions', () => {
    it('no plan yet: the builder gets her preferences, the default goal, her foods and the config', async () => {
      const res = await api.request('GET', planPath(), { token: coach.token });
      expect(res.body).toMatchObject({
        plan: null,
        published: null,
        defaultGoal: 'fat_loss',
        preferences: {
          dietType: 'vegetarian',
          dietStyles: [],
          religious: [{ id: 'kosher' }],
          intolerances: [],
          allergies: [{ id: 'tree_nuts' }],
          foodsDisliked: 'Mushrooms',
          mealsPerDay: null,
        },
        config: { floorKcal: 1200 },
        features: { nutritionRecipes: false, waterTracking: false },
      });
      expect(res.body.foods).toHaveLength(3);
    });

    it('autosaves the working copy: kcal from the group values, stable ids, preference warnings', async () => {
      const first = await savePlan({ calorieTarget: target(1500), meals: [breakfast()], tips: [{ text: 'Protein first' }] });
      expect(first.status).toBe(200);
      const plan = first.body.plan;
      expect(plan.kcal).toEqual({ meals: [{ mealId: plan.meals[0].id, kcal: 360 }], day: 360 });
      expect(plan.meals[0].options[0].lines[0]).toMatchObject({ kind: 'food', group: 'protein', portions: 1 });
      expect(plan.calorieTarget.suggestion.status).toBe('ok');
      expect(plan.publishedVersion).toBe(0);
      // Vegetarian (poultry), tree-nut allergy (almonds) — warnings only.
      expect(first.body.issues.map((issue: { code: string }) => issue.code)).toEqual(['preference_conflict', 'preference_conflict']);

      const again = await savePlan({
        calorieTarget: target(1500),
        meals: [{ ...breakfast(), id: plan.meals[0].id, options: [{ ...breakfast().options[0], id: plan.meals[0].options[0].id }] }],
        tips: [{ id: plan.tips[0].id, text: 'Protein first!' }],
      });
      expect(again.body.plan.meals[0].id).toBe(plan.meals[0].id);
      expect(again.body.plan.meals[0].options[0].id).toBe(plan.meals[0].options[0].id);
      expect(again.body.plan.tips[0]).toEqual({ id: plan.tips[0].id, text: 'Protein first!' });
    });

    it('the floor: below it needs a confirmation for that exact target, enforced on publish', async () => {
      await savePlan({ calorieTarget: target(1100), meals: [breakfast()] });
      const blocked = await publish();
      expect(blocked.status).toBe(400);
      expect(blocked.body.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'floor_unconfirmed' })]));

      const confirmed = await savePlan({ calorieTarget: target(1100, true), meals: [breakfast()] });
      expect(confirmed.body.plan.calorieTarget.floorConfirmation).toMatchObject({ kcal: 1100, floorKcal: 1200 });

      // Changing the target drops the confirmation.
      const changed = await savePlan({ calorieTarget: target(1050), meals: [breakfast()] });
      expect(changed.body.plan.calorieTarget.floorConfirmation).toBeNull();

      await savePlan({ calorieTarget: target(1050, true), meals: [breakfast()] });
      expect((await publish()).status).toBe(200);
      const version = await NutritionPlanVersion.findOne({ traineeId: trainee.user._id }).lean();
      expect(version?.calorieTarget.floorConfirmation).toMatchObject({ kcal: 1050, floorKcal: 1200 });
    });

    it('publish freezes a version and notifies; unchanged → 409; an edit → version 2 (update)', async () => {
      expect((await publish()).status).toBe(404);
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      const first = await publish();
      expect(first.status).toBe(200);
      expect(first.body.plan).toMatchObject({ publishedVersion: 1, changedSincePublish: false });
      expect(first.body.published.version).toBe(1);

      expect((await publish()).status).toBe(409);

      await savePlan({ calorieTarget: target(1500), meals: [breakfast({ name: 'Morning' })] });
      expect((await api.request('GET', planPath(), { token: coach.token })).body.plan.changedSincePublish).toBe(true);
      // The trainee still sees version 1 until the coach publishes.
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.meals[0].name).toBe('Breakfast');
      expect((await publish()).body.plan.publishedVersion).toBe(2);
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.meals[0].name).toBe('Morning');

      const notifications = await waitForNotifications(trainee.id, 2);
      expect(notifications.map((notification) => notification.data)).toEqual([
        expect.objectContaining({ version: 1, isUpdate: false }),
        expect.objectContaining({ version: 2, isUpdate: true }),
      ]);
      expect(notifications.every((notification) => notification.type === 'nutrition_plan_published')).toBe(true);
      expect(await NutritionPlanVersion.countDocuments({ traineeId: trainee.user._id })).toBe(2);
    });

    it("her view: meals, options, tips and swaps — no calorie number anywhere", async () => {
      const unusedFat = await createFood({ group: 'fat', name: 'Olive oil', portion: '2 tsp', kcal: 80 });
      const archivedFat = await createFood({ group: 'fat', name: 'Old butter', portion: '1 tsp' });
      await api.request('DELETE', `/coach/nutrition/foods/${archivedFat.id}`, { token: coach.token });
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()], tips: [{ text: 'Swap within a group' }] });
      await publish();

      const res = await api.request('GET', '/nutrition-plan', { token: trainee.token });
      const view = res.body.plan;
      expect(JSON.stringify(res.body)).not.toMatch(/kcal|calorie/i);
      expect(view.tips).toEqual(['Swap within a group']);
      expect(view.meals[0].portions).toEqual({ protein: 1, carb: 1, fat: 1, snack: 0 });
      expect(view.meals[0].options[0].lines[2].food).toEqual({ id: fat.id, group: 'fat', name: 'Almonds', portion: '10 pcs', grams: null, isNew: true, category: null });
      // The coach card's name (the publishing coach).
      expect(res.body.coach).toEqual({ name: coach.user.name });
      expect(view.meals[0].options[0].lines[3]).toMatchObject({ kind: 'text', text: 'Cut vegetables — free', group: 'vegetable' });
      expect(view.swaps.fat.map((food: { id: string }) => food.id)).toEqual([fat.id, unusedFat.id]);
      expect(view.swaps.vegetable).toEqual([]);
      expect(view).not.toHaveProperty('waterGoalMl');
      expect(res.body.features).toEqual({ nutritionRecipes: false, waterTracking: false });
    });
  });

  describe('templates', () => {
    it('saves her plan as a template and starts another trainee from it (fresh ids, target when none)', async () => {
      const otherOfMine = await createTestUser('lia@example.com', { coachId: coach.user._id, onboardingStatus: 'completed' });
      expect((await api.request('POST', `${planPath()}/template`, { token: coach.token, body: { name: 'Empty' } })).status).toBe(409);

      const saved = await savePlan({ calorieTarget: target(1500), meals: [breakfast()], tips: [{ text: 'Tip' }] });
      const created = await api.request('POST', `${planPath()}/template`, { token: coach.token, body: { name: '1,500 kcal' } });
      expect(created.status).toBe(201);
      expect(created.body.template).toMatchObject({ name: '1,500 kcal', targetKcal: 1500, kcal: { day: 360 } });
      expect(created.body.template.meals[0].id).not.toBe(saved.body.plan.meals[0].id);

      const list = await api.request('GET', '/coach/nutrition/templates', { token: coach.token });
      expect(list.body.items).toHaveLength(1);
      expect((await api.request('GET', '/coach/nutrition/templates', { token: otherCoach.token })).body.items).toHaveLength(0);

      const applied = await api.request('POST', `${planPath(otherOfMine.id)}/from-template`, {
        token: coach.token,
        body: { templateId: created.body.template.id },
      });
      expect(applied.status).toBe(200);
      expect(applied.body.plan).toMatchObject({ templateId: created.body.template.id, calorieTarget: { kcal: 1500, source: 'override' } });
      expect(applied.body.plan.meals[0].options[0].lines).toHaveLength(4);
      expect(applied.body.plan.tips.map((tip: { text: string }) => tip.text)).toEqual(['Tip']);

      // Another coach can't apply or delete it.
      expect(
        (await api.request('POST', `${planPath(otherTrainee.id)}/from-template`, {
          token: otherCoach.token,
          body: { templateId: created.body.template.id },
        })).status,
      ).toBe(404);
      // Rename: only hers, a name is required.
      const templatePath = `/coach/nutrition/templates/${created.body.template.id}`;
      expect((await api.request('PATCH', templatePath, { token: otherCoach.token, body: { name: 'Mine' } })).status).toBe(404);
      expect((await api.request('PATCH', templatePath, { token: coach.token, body: { name: '  ' } })).status).toBe(400);
      const renamed = await api.request('PATCH', templatePath, { token: coach.token, body: { name: 'Base 1,500' } });
      expect(renamed.status).toBe(200);
      expect(renamed.body.template).toMatchObject({ name: 'Base 1,500', targetKcal: 1500, kcal: { day: 360 } });

      expect((await api.request('DELETE', templatePath, { token: coach.token })).status).toBe(204);
    });

    it('one shape rule per type', async () => {
      const empty = new Template({ coachId: coach.user._id, type: 'nutrition_plan', name: 'Empty', nutrition: { meals: [] } });
      await expect(empty.validate()).rejects.toThrow(/at least one meal/);
      const mixed = new Template({
        coachId: coach.user._id,
        type: 'plan',
        name: 'Mixed',
        workouts: [{ title: 'W', order: 0, exercises: [] }],
        nutrition: { meals: [{ name: 'M', portions: {}, options: [] }] },
      });
      await expect(mixed.validate()).rejects.toThrow(/Only a nutrition template/);
    });
  });

  describe('feature flags (13b, closed by default)', () => {
    it('a closed feature: its payload is refused; open: accepted and sent to her', async () => {
      const closed = await savePlan({ calorieTarget: target(1500), meals: [breakfast()], waterGoalMl: 2000 });
      expect(closed.status).toBe(400);

      setFeatureFlagsForTests({ waterTracking: true });
      const open = await savePlan({ calorieTarget: target(1500), meals: [breakfast()], waterGoalMl: 2000 });
      expect(open.body.plan.waterGoalMl).toBe(2000);
      expect(open.body.features.waterTracking).toBe(true);
      await publish();
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.waterGoalMl).toBe(2000);
    });

    it('requireFeature answers 404 while closed and passes when open', () => {
      const run = () => {
        let status = 0;
        let passed = false;
        const res = { status: (code: number) => ({ json: () => { status = code; } }) } as unknown as Response;
        requireFeature('waterTracking')({} as Request, res, () => { passed = true; });
        return { status, passed };
      };
      expect(run()).toEqual({ status: 404, passed: false });
      setFeatureFlagsForTests({ waterTracking: true });
      expect(run()).toEqual({ status: 0, passed: true });
    });
  });

  it('the working copy is never visible to the trainee before a publish', async () => {
    await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
    expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan).toBeNull();
    expect(await NutritionPlan.countDocuments()).toBe(1);
    expect(await Notification.countDocuments({ userId: trainee.user._id })).toBe(0);
  });

  describe('calculation summary and intro (Phase 13a+)', () => {
    it("uses her weight goal: an unsafe pace is capped and the coach sees the recommended timeline", async () => {
      // 70 → 60 kg "in 4 weeks" (set today).
      await OnboardingResponse.updateOne(
        { userId: trainee.user._id },
        { $set: { 'answers.weightGoal': { targetWeightKg: 60, timeframe: { kind: 'weeks', weeks: 4 }, setAt: new Date() } } },
      );
      const res = await api.request('GET', `${planPath()}/suggestion`, { token: coach.token });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        method: 'timeline',
        inputs: { targetWeightKg: 60, timelineWeeks: 4 },
        timeline: { requestedWeeks: 4, unsafe: true, limitedBy: 'max_deficit' },
      });
      expect(res.body.timeline.recommendedWeeks).toBeGreaterThan(4);
      expect(res.body.kcal).toBeGreaterThanOrEqual(1200);
      expect(res.body.portions).toEqual(expect.objectContaining({ protein: expect.any(Number), carb: expect.any(Number), fat: expect.any(Number) }));
    });

    it("takes the coach's overrides from the query and stores them with the plan", async () => {
      const live = await api.request('GET', `${planPath()}/suggestion?weightKg=80&timelineWeeks=40&targetWeightKg=72`, { token: coach.token });
      expect(live.body.inputs).toMatchObject({ weightKg: 80, weightSource: 'coach', targetWeightKg: 72, timelineWeeks: 40 });
      expect(live.body.inputs.overridden).toEqual(['weightKg', 'targetWeightKg', 'timelineWeeks']);
      expect((await api.request('GET', `${planPath()}/suggestion?ageYears=2`, { token: coach.token })).status).toBe(400);

      const overrides = { weightKg: 80, heightCm: null, ageYears: null, activityFactor: 1.2, targetWeightKg: null, timelineWeeks: null };
      const saved = await savePlan({ calorieTarget: { ...target(1500), overrides }, meals: [breakfast()] });
      expect(saved.status).toBe(200);
      expect(saved.body.plan.calorieTarget.overrides).toEqual(overrides);
      expect(saved.body.plan.calorieTarget.suggestion.inputs).toMatchObject({ weightKg: 80, activityFactor: 1.2 });
      // Omitted on the next save = kept.
      const kept = await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      expect(kept.body.plan.calorieTarget.overrides).toEqual(overrides);
      expect(kept.body.plan.dayPortions).toEqual({ protein: 1, carb: 1, fat: 1, snack: 0 });
      expect(kept.body.plan.targetPortions).toEqual({ protein: 4.5, carb: 4, fat: 4, snack: 0 });
      const bad = await savePlan({ calorieTarget: { ...target(1500), overrides: { ...overrides, activityFactor: 9 } }, meals: [breakfast()] });
      expect(bad.status).toBe(400);
    });

    it('the intro is saved per version, counts as a change, and opens until she has read it', async () => {
      const intro = '  Hi Maya!\r\nSmall steps.\n\nYou got this.  ';
      await savePlan({ calorieTarget: target(1500), meals: [breakfast(), breakfast({ name: 'Lunch' })], introMessage: intro });
      expect((await publish()).status).toBe(200);

      const first = await api.request('GET', '/nutrition-plan', { token: trainee.token });
      expect(first.body.plan.intro).toBe('Hi Maya!\nSmall steps.\n\nYou got this.');
      expect(first.body.plan.dayPortions).toEqual({ protein: 2, carb: 2, fat: 2, snack: 0 });
      expect(first.body.introUnseen).toBe(true);

      expect((await api.request('POST', '/nutrition-plan/intro-seen', { token: trainee.token, body: { version: 1 } })).status).toBe(204);
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.introUnseen).toBe(false);
      expect((await api.request('POST', '/nutrition-plan/intro-seen', { token: trainee.token, body: { version: 'x' } })).status).toBe(400);

      // Omitted keeps it; a changed intro alone is a new version, unseen again.
      const sameMeals = (await api.request('GET', planPath(), { token: coach.token })).body.plan.meals;
      await savePlan({ calorieTarget: target(1500), meals: sameMeals });
      expect((await publish()).status).toBe(409);
      await savePlan({ calorieTarget: target(1500), meals: sameMeals, introMessage: 'New week!' });
      expect((await publish()).status).toBe(200);
      const second = await api.request('GET', '/nutrition-plan', { token: trainee.token });
      expect(second.body.plan).toMatchObject({ version: 2, intro: 'New week!' });
      expect(second.body.introUnseen).toBe(true);
      // Never moves backwards.
      await api.request('POST', '/nutrition-plan/intro-seen', { token: trainee.token, body: { version: 2 } });
      await api.request('POST', '/nutrition-plan/intro-seen', { token: trainee.token, body: { version: 1 } });
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.introUnseen).toBe(false);

      expect((await savePlan({ calorieTarget: target(1500), meals: [breakfast()], introMessage: 'x'.repeat(1501) })).status).toBe(400);
      // Cleared: no intro, nothing to open.
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()], introMessage: '' });
      await publish();
      const cleared = await api.request('GET', '/nutrition-plan', { token: trainee.token });
      expect(cleared.body.plan.intro).toBeNull();
      expect(cleared.body.introUnseen).toBe(false);
    });

    it('the tip goes out with the note, {name} = her first name, and a later default never changes what she got', async () => {
      const defaults = (body: object, token = coach.token) => api.request('PATCH', '/coach/profile/defaults', { token, body });
      expect((await api.request('GET', '/coach/profile/defaults', { token: coach.token })).body.defaults).toEqual({ nutrition: { message: null, tip: null } });
      expect((await defaults({ nutrition: { message: '  Hi {name}!\r\nLet us go.  ' } })).body.defaults).toEqual({ nutrition: { message: 'Hi {name}!\nLet us go.', tip: null } });
      expect((await defaults({ nutrition: { tip: 'Water first' } })).body.defaults.nutrition).toEqual({ message: 'Hi {name}!\nLet us go.', tip: 'Water first' });
      expect((await defaults({ nutrition: { message: 'x'.repeat(601) } })).status).toBe(400);
      expect((await defaults({ nutrition: { tip: 'x'.repeat(301) } })).status).toBe(400);
      expect((await defaults({ workouts: { message: 'x' } })).status).toBe(400);
      expect((await defaults({ nutrition: { other: 'x' } })).status).toBe(400);
      // Only coaches, and each only her own.
      expect((await defaults({ nutrition: { tip: 'x' } }, trainee.token)).status).toBe(403);
      expect((await api.request('GET', '/coach/profile/defaults', { token: trainee.token })).status).toBe(403);

      await savePlan({ calorieTarget: target(1500), meals: [breakfast()], introMessage: 'Hi {name}!', introTip: ' Drink water, {name} ' });
      expect((await api.request('GET', planPath(), { token: coach.token })).body.plan).toMatchObject({ introMessage: 'Hi {name}!', introTip: 'Drink water, {name}' });
      expect((await publish()).status).toBe(200);
      const first = await api.request('GET', '/nutrition-plan', { token: trainee.token });
      const firstName = 'maya'; // createTestUser names her after the email
      expect(first.body.plan).toMatchObject({ intro: `Hi ${firstName}!`, introTip: `Drink water, ${firstName}` });
      expect(first.body.coach.name.length).toBeGreaterThan(0);
      // The coach's view of the published version reads the same.
      expect((await api.request('GET', planPath(), { token: coach.token })).body.published.introTip).toBe(`Drink water, ${firstName}`);

      // Changing the default touches nothing she received; a changed tip alone is a new version.
      await defaults({ nutrition: { message: 'Something else', tip: null } });
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.introTip).toBe(`Drink water, ${firstName}`);
      const sameMeals = (await api.request('GET', planPath(), { token: coach.token })).body.plan.meals;
      await savePlan({ calorieTarget: target(1500), meals: sameMeals, introTip: 'Sleep well' });
      expect((await publish()).status).toBe(200);
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan).toMatchObject({ version: 2, introTip: 'Sleep well' });

      expect((await savePlan({ calorieTarget: target(1500), meals: sameMeals, introTip: 'x'.repeat(301) })).status).toBe(400);
      // A tip alone (no note) still opens as unseen.
      await savePlan({ calorieTarget: target(1500), meals: sameMeals, introMessage: '', introTip: 'Only a tip' });
      await publish();
      const tipOnly = await api.request('GET', '/nutrition-plan', { token: trainee.token });
      expect(tipOnly.body.plan).toMatchObject({ intro: null, introTip: 'Only a tip' });
      expect(tipOnly.body.introUnseen).toBe(true);
    });
  });

  describe('daily protein goal (owner, 2026-10-28)', () => {
    it('saves whole grams on the plan, counts as a change, reaches her view; null clears; out of range is refused', async () => {
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      expect((await publish()).status).toBe(200);
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.proteinGramsTarget).toBeNull();

      const meals = (await api.request('GET', planPath(), { token: coach.token })).body.plan.meals;
      const saved = await savePlan({ calorieTarget: target(1500), meals, proteinGramsTarget: 120 });
      expect(saved.body.plan.proteinGramsTarget).toBe(120);
      expect(saved.body.plan.changedSincePublish).toBe(true);
      expect((await publish()).status).toBe(200);
      expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.proteinGramsTarget).toBe(120);

      // Omitted keeps it.
      expect((await savePlan({ calorieTarget: target(1500), meals })).body.plan.proteinGramsTarget).toBe(120);
      for (const bad of [0, 401, 12.5, '120']) {
        expect((await savePlan({ calorieTarget: target(1500), meals, proteinGramsTarget: bad })).status).toBe(400);
      }
      expect((await savePlan({ calorieTarget: target(1500), meals, proteinGramsTarget: null })).body.plan.proteinGramsTarget).toBeNull();
    });
  });

  describe('snack group (13a+)', () => {
    it('snack items are capped at 150; a meal with a snack portion counts it, she sees it as a group with its own swaps', async () => {
      const tooMuch = await api.request('POST', '/coach/nutrition/foods', { token: coach.token, body: { group: 'snack', name: 'Bamba', portion: '28 g', kcal: 160 } });
      expect(tooMuch.status).toBe(400);
      const bamba = await createFood({ group: 'snack', name: 'Bamba', portion: '28 g', dietTags: ['peanuts'] });
      const snackMeal = {
        name: 'Treat',
        portions: { protein: 0, carb: 0, fat: 0, snack: 1 },
        vegetablesFree: false,
        options: [{ label: 'A', lines: [{ kind: 'food', foodItemId: bamba.id, portions: 1 }] }],
      };
      const saved = await savePlan({ calorieTarget: target(1500), meals: [breakfast(), snackMeal] });
      expect(saved.status).toBe(200);
      expect(saved.body.plan.kcal.day).toBe(360 + 150);
      expect(saved.body.plan.dayPortions).toEqual({ protein: 1, carb: 1, fat: 1, snack: 1 });
      // The recommendation never adds snack portions.
      expect(saved.body.plan.targetPortions.snack).toBe(0);
      expect(saved.body.issues.map((issue: { code: string }) => issue.code)).not.toContain('option_portions_mismatch');
      await publish();
      const view = (await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan;
      expect(view.dayPortions.snack).toBe(1);
      expect(view.swaps.snack.map((food: { name: string }) => food.name)).toEqual(['Bamba']);
      expect(JSON.stringify(view)).not.toMatch(/kcal|calorie/i);
    });
  });

  describe('plan mode (portions / menu, owner 2026-10-20)', () => {
    it('a plan saved before modes reads as menu with option lines, else portions with its meals summed', async () => {
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      expect((await api.request('GET', planPath(trainee.id), { token: coach.token })).body.plan.mode).toBe('menu');

      const bare = { ...breakfast(), options: [] };
      await savePlan({ calorieTarget: target(1500), meals: [bare, bare] });
      await NutritionPlan.updateOne({ traineeId: trainee.user._id }, { $set: { mode: null, dailyPortions: null } });
      const plan = (await api.request('GET', planPath(trainee.id), { token: coach.token })).body.plan;
      expect(plan.mode).toBe('portions');
      expect(plan.dailyPortions).toEqual({ protein: 2, carb: 2, fat: 2, snack: 0 });
    });

    it('portions mode: the daily portions are her day (kcal, view, tracker); the meals stay but she gets none', async () => {
      const saved = await savePlan({
        calorieTarget: target(1500),
        meals: [breakfast()],
        mode: 'portions',
        dailyPortions: { protein: 4, carb: 3.5, fat: 3, snack: 0 },
        vegetablesFree: true,
      });
      expect(saved.status).toBe(200);
      expect(saved.body.plan.mode).toBe('portions');
      expect(saved.body.plan.dayPortions).toEqual({ protein: 4, carb: 3.5, fat: 3, snack: 0 });
      expect(saved.body.plan.kcal.day).toBe(4 * 150 + 3.5 * 120 + 3 * 90);
      expect(saved.body.plan.meals).toHaveLength(1);
      expect((await publish()).status).toBe(200);

      const view = (await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan;
      expect(view.mode).toBe('portions');
      expect(view.meals).toEqual([]);
      expect(view.dayPortions).toEqual({ protein: 4, carb: 3.5, fat: 3, snack: 0 });
      expect(view.vegetablesFree).toBe(true);
      expect(JSON.stringify(view)).not.toMatch(/kcal|calorie/i);

      const days = (await api.request('GET', '/meal-logs', { token: trainee.token })).body.days;
      expect(days.at(-1).planned).toEqual({ protein: 4, carb: 3.5, fat: 3, snack: 0 });
    });

    it('portions mode needs some daily portions; switching back to menu keeps both sides', async () => {
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()], mode: 'portions', dailyPortions: { protein: 0, carb: 0, fat: 0, snack: 0 } });
      const refused = await publish();
      expect(refused.status).toBe(400);
      expect(refused.body.issues.map((issue: { code: string }) => issue.code)).toContain('no_portions');

      await savePlan({ calorieTarget: target(1500), meals: [breakfast()], mode: 'portions', dailyPortions: { protein: 4, carb: 3, fat: 3, snack: 0 } });
      const back = (await savePlan({ calorieTarget: target(1500), meals: [breakfast()], mode: 'menu' })).body.plan;
      expect(back.mode).toBe('menu');
      expect(back.dailyPortions).toEqual({ protein: 4, carb: 3, fat: 3, snack: 0 });
      expect(back.dayPortions).toEqual({ protein: 1, carb: 1, fat: 1, snack: 0 });

      const invalid = await savePlan({ calorieTarget: target(1500), meals: [], dailyPortions: { protein: 0.3, carb: 0, fat: 0, snack: 0 } });
      expect(invalid.status).toBe(400);
    });

    it('applying a template makes the plan a menu', async () => {
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      const template = await api.request('POST', `${planPath(trainee.id)}/template`, { token: coach.token, body: { name: 'Base' } });
      await savePlan({ calorieTarget: target(1500), meals: [], mode: 'portions', dailyPortions: { protein: 4, carb: 3, fat: 3, snack: 0 } });
      const applied = await api.request('POST', `${planPath(trainee.id)}/from-template`, { token: coach.token, body: { templateId: template.body.template.id } });
      expect(applied.status).toBe(200);
      expect(applied.body.plan.mode).toBe('menu');
    });
  });

  describe('food categories and recently used (13a+)', () => {
    it('a category must belong to the group; moving to another group clears one that no longer fits', async () => {
      const wrong = await api.request('POST', '/coach/nutrition/foods', { token: coach.token, body: { group: 'protein', name: 'Bread', portion: '1', category: 'bread_crackers' } });
      expect(wrong.status).toBe(400);
      expect((await api.request('POST', '/coach/nutrition/foods', { token: coach.token, body: { group: 'protein', name: 'X', portion: '1', category: 'nope' } })).status).toBe(400);
      const cottage = await api.request('POST', '/coach/nutrition/foods', { token: coach.token, body: { group: 'protein', name: 'Cottage', portion: '150 g', category: 'dairy' } });
      expect(cottage.body.item.category).toBe('dairy');
      const moved = await api.request('PATCH', `/coach/nutrition/foods/${cottage.body.item.id}`, { token: coach.token, body: { group: 'snack' } });
      expect(moved.body.item).toMatchObject({ group: 'snack', category: null });
      const set = await api.request('PATCH', `/coach/nutrition/foods/${cottage.body.item.id}`, { token: coach.token, body: { category: 'salty' } });
      expect(set.body.item.category).toBe('salty');
      const cleared = await api.request('PATCH', `/coach/nutrition/foods/${cottage.body.item.id}`, { token: coach.token, body: { category: null } });
      expect(cleared.body.item.category).toBeNull();
    });

    it('recently used: her items per group from her plans, newest plan first, distinct', async () => {
      const other = await createFood({ group: 'protein', name: 'Tofu', portion: '100 g' });
      await savePlan({ calorieTarget: target(1500), meals: [breakfast()] });
      // A plan of another of her trainees, saved later: its items come first.
      const secondTrainee = await createTestUser('noa@example.com', { coachId: coach.user._id, onboardingStatus: 'completed', onboardingCompletedAt: new Date() });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await savePlan(
        { calorieTarget: target(1500), meals: [breakfast({ options: [{ label: 'A', lines: [{ kind: 'food', foodItemId: other.id, portions: 1 }, { kind: 'food', foodItemId: protein.id, portions: 1 }] }] })] },
        secondTrainee.id,
      );
      const res = await api.request('GET', planPath(), { token: coach.token });
      expect(res.body.recentFoodIds.protein).toEqual([other.id, protein.id]);
      expect(res.body.recentFoodIds.carb).toEqual([carb.id]);
      expect(res.body.recentFoodIds.snack).toEqual([]);
      // Another coach sees only hers.
      expect((await api.request('GET', planPath(otherTrainee.id), { token: otherCoach.token })).body.recentFoodIds.protein).toEqual([]);
    });
  });
});
