import { Coaching } from '../../coachings/coaching.model';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { config } from '../../../config/env';
import { setFeatureFlagsForTests } from '../../../config/features';
import { aiClient } from '../../ai/ai.client';
import { AI_CONFIG } from '../../ai/ai.config';
import type { AiJsonRequest, AiJsonResponse } from '../../ai/ai.types';
import { Notification } from '../../notifications/notification.model';
import { OnboardingResponse } from '../../onboarding/onboardingResponse.model';
import { FoodItem } from '../../nutrition/foodItem.model';
import { NutritionPlan, NutritionPlanVersion } from '../../nutrition/nutritionPlan.model';
import { AiRecommendation } from '../aiRecommendation.model';
import { onTraineeOnboardedStartDraft } from '../aiRecommendation.listeners';
import { startRecommendation } from '../aiRecommendation.service';
import { User } from '../../users/user.model';

// Phase 13c (PRD §5.6): the AI nutrition draft through the real pipeline and API — the
// food list filtered in code before the model, the reply validated (retry, reject), the
// coach loading it, and nothing reaching the trainee. The model is always faked.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const PORTION_GROUPS = ['protein', 'carb', 'fat', 'snack'] as const;
type Counts = Record<(typeof PORTION_GROUPS)[number], number>;

const ANSWERS = {
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
    intolerances: [{ id: 'lactose_free', details: 'Lactose ok in yogurt.' }],
    allergies: [{ id: 'tree_nuts' }],
    foodsDisliked: 'Mushrooms. Mail me at maya@example.com',
    mealsPerDay: 3,
  },
};

const FOODS = [
  { group: 'protein', name: 'Chicken breast', portion: '130 g', dietTags: ['poultry'] },
  { group: 'protein', name: 'Cottage 5%', portion: '150 g', dietTags: ['dairy', 'lactose'] },
  { group: 'protein', name: 'Eggs', portion: '2 L', dietTags: ['eggs'] },
  { group: 'protein', name: 'Tofu', portion: '150 g', dietTags: ['soy'] },
  { group: 'protein', name: 'Hard cheese', portion: '40 g', dietTags: ['dairy'] },
  { group: 'carb', name: 'Oats', portion: '30 g', dietTags: ['gluten'] },
  { group: 'carb', name: 'Rice', portion: '1 cup', dietTags: [] },
  { group: 'carb', name: 'Banana', portion: '1 medium', dietTags: [] },
  { group: 'fat', name: 'Almonds', portion: '10', dietTags: ['tree_nuts'] },
  { group: 'fat', name: 'Olive oil', portion: '2 tsp', dietTags: [] },
  { group: 'fat', name: 'Avocado', portion: '1/4', dietTags: [] },
  { group: 'snack', name: 'Chocolate bar', portion: '30 g', dietTags: ['dairy'] },
];

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
let generate: MockInstance<typeof aiClient.generateJson>;
let savedKey: string;

const aiPath = (traineeId = trainee.id) => `/coach/trainees/${traineeId}/ai-recommendations`;

async function seedFoods(foods = FOODS, user = coach) {
  for (const body of foods) {
    const res = await api.request('POST', '/coach/nutrition/foods', { token: user.token, body });
    expect(res.status).toBe(201);
  }
}

/** What the prompt listed: food aliases with their group, the slots and the fixed daily portions. */
function parsePrompt(request: AiJsonRequest) {
  const text = request.messages[0].text;
  const foods = [...text.matchAll(/^(F\d{3}) \| (\w+) \|/gm)].map((match) => ({ alias: match[1], group: match[2] }));
  const slots = [...text.matchAll(/^(M\d) \|/gm)].map((match) => match[1]);
  const daily = text.match(/^DAILY PORTIONS.*: protein ([\d.]+), carb ([\d.]+), fat ([\d.]+), snack ([\d.]+)$/m)!;
  const dailyPortions = { protein: Number(daily[1]), carb: Number(daily[2]), fat: Number(daily[3]), snack: Number(daily[4]) };
  return { text, foods, slots, dailyPortions };
}

/** A reply that follows the rules: each group's half portions dealt round-robin over the meals. */
function validReply(request: AiJsonRequest, skipAliases: string[] = []) {
  const { foods, slots, dailyPortions } = parsePrompt(request);
  const meals: Counts[] = slots.map(() => ({ protein: 0, carb: 0, fat: 0, snack: 0 }));
  let slot = 0;
  for (const group of PORTION_GROUPS) {
    for (let unit = 0; unit < dailyPortions[group] * 2; unit += 1) {
      meals[slot % slots.length][group] += 0.5;
      slot += 1;
    }
  }
  const firstOf = (group: string) => foods.find((item) => item.group === group && !skipAliases.includes(item.alias))!.alias;
  return {
    summary: 'Vegetarian, kosher, lactose-free; losing weight at a safe pace.',
    considerations: ['Lactose seems ok in yogurt for her — yogurts were filtered out.'],
    meals: slots.map((id, index) => ({
      meal: id,
      portions: meals[index],
      vegetablesFree: index > 0,
      why: 'Spread over the day.',
      options: [
        {
          why: 'Simple.',
          lines: PORTION_GROUPS.filter((group) => meals[index][group] > 0).map((group) => ({ food: firstOf(group), portions: meals[index][group] })),
        },
      ],
    })),
  };
}

function reply(body: unknown): AiJsonResponse {
  return { text: JSON.stringify(body), model: 'fake-model', finish: 'stop', usage: { inputTokens: 100, outputTokens: 50, thinkingTokens: 0 } };
}

async function createAnswers(answers: Record<string, unknown> = ANSWERS, user = trainee) {
  await OnboardingResponse.create({ userId: user.user._id, completedAt: new Date(), answers });
}

async function runDraft(traineeId = trainee.id) {
  const coachingId = String((await Coaching.findOne({ traineeId, coachId: coach.id, live: true }).lean())!._id);
  const started = await startRecommendation({ traineeId, coachId: coach.id, coachingId, type: 'nutrition_plan', trigger: 'coach' });
  await started.run;
  return AiRecommendation.findById(started.recommendation._id).lean();
}

function latest(user = coach, traineeId = trainee.id) {
  return api.request('GET', `${aiPath(traineeId)}/latest?type=nutrition_plan`, { token: user.token });
}

describe('AI nutrition recommendations', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([AiRecommendation.init(), FoodItem.init(), NutritionPlanVersion.init()]);
    api = await startApiTestClient();
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    setFeatureFlagsForTests({ nutritionRecipes: false, waterTracking: false });
    savedKey = config.ai.geminiApiKey;
    config.ai.geminiApiKey = 'test-key';
    // English: the assertions below read the English placeholders (a Hebrew coach is tested on its own).
    coach = await createTestUser('coach@example.com', { role: 'coach', preferences: { language: 'en' } });
    otherCoach = await createTestUser('other-coach@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', {
      coachId: coach.user._id,
      onboardingStatus: 'completed',
      onboardingCompletedAt: new Date(),
    });
    await seedFoods();
    generate = vi.spyOn(aiClient, 'generateJson').mockImplementation(async (request) => reply(validReply(request)));
  });

  afterEach(() => {
    config.ai.geminiApiKey = savedKey;
    vi.restoreAllMocks();
  });

  it('filters her food list in code before the model, and sends nothing that identifies her', async () => {
    await createAnswers();
    const doc = await runDraft();
    expect(doc?.status).toBe('ready');

    const { text, foods, slots, dailyPortions } = parsePrompt(generate.mock.calls[0][0]);
    // Vegetarian → no chicken; lactose-free → no cottage; tree nuts → no almonds; no snack portions → no snack items.
    for (const name of ['Chicken breast', 'Cottage 5%', 'Almonds', 'Chocolate bar']) expect(text).not.toContain(name);
    for (const name of ['Eggs', 'Tofu', 'Hard cheese', 'Rice', 'Olive oil']) expect(text).toContain(name);
    expect(foods.map((item) => item.group)).not.toContain('snack');
    expect(dailyPortions.snack).toBe(0);
    // Her "3 meals a day".
    expect(slots).toEqual(['M1', 'M2', 'M3']);
    // Her words, cleaned; no name / email / ids / birth date.
    expect(text).toContain('Lactose ok in yogurt.');
    expect(text).toContain('[email removed]');
    for (const secret of ['maya@example.com', 'Maya', '1995-04-12', trainee.id, coach.id]) expect(text).not.toContain(secret);

    const res = await latest();
    expect(res.status).toBe(200);
    const recommendation = res.body.recommendation;
    expect(recommendation.type).toBe('nutrition_plan');
    expect(recommendation.input.foods.protein).toEqual({ sent: 3, filteredOut: 2 });
    expect(recommendation.input.foodAliases).toBeUndefined();
    expect(recommendation.input.profile.freeText).toContainEqual({ source: 'intolerance:lactose_free', text: 'Lactose ok in yogurt.' });
    expect(recommendation.input.calculation.dailyPortions).toEqual(dailyPortions);
    expect(recommendation.output.meals.map((meal: { name: string }) => meal.name)).toEqual(['Breakfast', 'Lunch', 'Dinner']);
    expect(recommendation.output.meals[0].options[0].label).toBe('Option A');
    expect(recommendation.output.meals[0].options[0].lines[0].food).toMatchObject({ name: 'Eggs', archived: false });
    expect(recommendation.output.kcal).toBe(recommendation.input.calculation.kcal);
  });

  it('starts a nutrition draft next to the training draft when onboarding completes', async () => {
    const newcomer = await createTestUser('dana@example.com', { coachId: coach.user._id });
    const res = await api.request('POST', '/onboarding/complete', {
      token: newcomer.token,
      body: {
        name: 'Dana',
        birthDate: '1995-04-12',
        height: 165,
        weight: 60,
        gender: 'female',
        units: { weight: 'kg', distance: 'km' },
        goals: ['build_muscle'],
        trainingFrequency: { minDays: 3, maxDays: 3, flexibleSchedule: false },
        preferredActivities: ['gym_strength_training'],
        exercisePreferences: { muscleFocus: ['glutes'] },
        equipment: ['full_gym'],
        recovery: { flags: ['nothing_to_add'] },
      },
    });
    expect(res.status).toBe(200);
    for (let i = 0; i < 200; i += 1) {
      const doc = await AiRecommendation.findOne({ traineeId: newcomer.id, type: 'nutrition_plan' }).lean();
      if (doc?.status === 'ready') break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const docs = await AiRecommendation.find({ traineeId: newcomer.id }).lean();
    expect(docs.map((doc) => doc.type).sort()).toEqual(['nutrition_plan', 'training_plan']);
    const nutrition = docs.find((doc) => doc.type === 'nutrition_plan')!;
    expect(nutrition.status).toBe('ready');
    expect(nutrition.trigger).toBe('onboarding');
    // She skipped the nutrition step: nothing was filtered, the coach is told.
    expect((nutrition.input as { profile: { nutritionAnswered: boolean } }).profile.nutritionAnswered).toBe(false);
  });

  it('does not start a nutrition draft at onboarding when the coach has no food list', async () => {
    await FoodItem.deleteMany({});
    const newcomer = await createTestUser('dana@example.com', { coachId: coach.user._id });
    await onTraineeOnboardedStartDraft({ traineeId: newcomer.id, coachId: coach.id } as Parameters<typeof onTraineeOnboardedStartDraft>[0]);
    expect(await AiRecommendation.countDocuments({ traineeId: newcomer.id, type: 'nutrition_plan' })).toBe(0);
  });

  it('sends the issues back and retries when the totals are off, then accepts a corrected reply', async () => {
    await createAnswers();
    generate.mockImplementationOnce(async (request) => {
      const body = validReply(request);
      body.meals[0].portions.protein += 1;
      body.meals[0].options[0].lines[0].portions += 1;
      return reply(body);
    });
    const doc = await runDraft();
    expect(doc?.status).toBe('ready');
    expect(doc?.attempts).toHaveLength(2);
    expect(doc?.attempts[0].issues[0]).toMatch(/^Daily protein portions add up to/);
    const retry = generate.mock.calls[1][0].messages;
    expect(retry).toHaveLength(3);
    expect(retry[2].text).toContain('Daily protein portions add up to');
  });

  it('sends text with letters of another writing system back to the model, like any other problem', async () => {
    await createAnswers();
    generate.mockImplementationOnce(async (request) => {
      const body = validReply(request);
      body.meals[0].options[0].why = 'ארוחה קลาสית'; // Thai letters inside a Hebrew word
      return reply(body);
    });
    const doc = await runDraft();
    expect(doc?.status).toBe('ready');
    expect(doc?.attempts).toHaveLength(2);
    expect(doc?.attempts[0].issues).toHaveLength(1);
    expect(doc?.attempts[0].issues[0]).toContain('meals[0].options[0].why');
    expect(generate.mock.calls[1][0].messages[2].text).toContain('another writing system');
  });

  it('rejects the draft after the last attempt and tells the coach', async () => {
    await createAnswers();
    generate.mockImplementation(async (request) => {
      const body = validReply(request);
      body.meals[0].options[0].lines[0].food = 'F250';
      return reply(body);
    });
    const doc = await runDraft();
    expect(doc?.status).toBe('failed');
    expect(doc?.error?.code).toBe('invalid_output');
    expect(doc?.attempts).toHaveLength(AI_CONFIG.maxAttempts);
    expect((await latest()).body.recommendation.output).toBeNull();
  });

  it('rechecks the food list after the reply: an item archived meanwhile is sent back', async () => {
    await createAnswers();
    let firstProtein = '';
    generate.mockImplementationOnce(async (request) => {
      firstProtein = parsePrompt(request).foods.find((item) => item.group === 'protein')!.alias;
      await FoodItem.updateOne({ coachId: coach.user._id, name: 'Eggs' }, { $set: { archivedAt: new Date() } });
      return reply(validReply(request));
    });
    generate.mockImplementationOnce(async (request) => reply(validReply(request, [firstProtein])));
    const doc = await runDraft();
    expect(doc?.attempts[0].issues).toEqual([`${firstProtein} (Eggs) is no longer in the coach's list — choose another food.`]);
    expect(doc?.status).toBe('ready');
  });

  it("writes the meal names, option labels and the model's coach texts in the coach's language (Phase 15)", async () => {
    await User.updateOne({ _id: coach.user._id }, { $set: { 'preferences.language': 'he' } });
    await createAnswers();
    const doc = await runDraft();
    expect(doc?.status).toBe('ready');
    expect(generate.mock.calls[0][0].system).toContain('plain Hebrew');

    const res = await latest();
    const meals = res.body.recommendation.output.meals;
    expect(meals.map((meal: { name: string }) => meal.name)).toEqual(['ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב']);
    expect(meals[0].options[0].label).toBe('אפשרות א');
  });

  it('does not ask the model when her restrictions leave a group empty', async () => {
    await FoodItem.deleteMany({ name: { $in: ['Olive oil', 'Avocado'] } });
    await createAnswers();
    const doc = await runDraft();
    expect(generate).not.toHaveBeenCalled();
    expect(doc?.status).toBe('failed');
    expect(doc?.error).toMatchObject({ code: 'not_enough_data', message: expect.stringContaining('no fat items are left') });
  });

  it('does not ask the model when the calculation is missing her data', async () => {
    await createAnswers({ ...ANSWERS, height: undefined });
    const doc = await runDraft();
    expect(generate).not.toHaveBeenCalled();
    expect(doc?.error?.message).toContain('missing her height');
  });

  it("uses the coach's own target from her working copy", async () => {
    await createAnswers();
    const saved = await api.request('PUT', `/coach/trainees/${trainee.id}/nutrition-plan`, {
      token: coach.token,
      body: { calorieTarget: { kcal: 1500, source: 'override', goal: 'fat_loss', formulaSex: null, confirmBelowFloor: false }, meals: [], tips: [] },
    });
    expect(saved.status).toBe(200);
    await runDraft();
    const { input, output } = (await latest()).body.recommendation;
    expect(input.calculation).toMatchObject({ targetSource: 'plan', kcal: 1500 });
    expect(output.kcal).toBe(1500);
  });

  it('is coach-only: the trainee gets 403, another coach 404', async () => {
    await createAnswers();
    await runDraft();
    expect((await latest(trainee)).status).toBe(403);
    expect((await latest(otherCoach)).status).toBe(404);
    const generateAsTrainee = await api.request('POST', aiPath(), { token: trainee.token, body: { type: 'nutrition_plan' } });
    expect(generateAsTrainee.status).toBe(403);
  });

  it('lets the coach generate on demand (202), one run at a time', async () => {
    await createAnswers();
    // The model answers only when the test says so: the first run is still active for the second POST.
    let release: () => void = () => undefined;
    const answered = new Promise<void>((resolve) => (release = resolve));
    generate.mockImplementation(async (request) => {
      await answered;
      return reply(validReply(request));
    });
    const first = await api.request('POST', aiPath(), { token: coach.token, body: { type: 'nutrition_plan' } });
    const second = await api.request('POST', aiPath(), { token: coach.token, body: { type: 'nutrition_plan' } });
    expect(first.status).toBe(202);
    expect(second.status).toBe(409);
    expect(second.body.recommendation.id).toBe(first.body.recommendation.id);
    expect(first.body.recommendation.type).toBe('nutrition_plan');
    release();
    for (let i = 0; i < 200 && (await AiRecommendation.exists({ active: true })); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  it('never reaches the trainee: no plan, no notification, and a coach-only link that publish never copies', async () => {
    await createAnswers();
    const doc = await runDraft();
    const id = String(doc!._id);
    expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan).toBeNull();
    expect(await Notification.countDocuments({ userId: trainee.user._id })).toBe(0);

    // The coach loads it: the meals come in as an ordinary working copy, linked to the draft.
    const { output } = (await latest()).body.recommendation;
    const meals = output.meals.map((meal: { name: string; portions: Counts; vegetablesFree: boolean; options: { label: string; lines: { foodItemId: string; portions: number }[] }[] }) => ({
      name: meal.name,
      portions: meal.portions,
      vegetablesFree: meal.vegetablesFree,
      options: meal.options.map((option) => ({
        label: option.label,
        lines: option.lines.map((line) => ({ kind: 'food', foodItemId: line.foodItemId, portions: line.portions })),
      })),
    }));
    const body = {
      calorieTarget: { kcal: output.kcal, source: 'suggested', goal: 'fat_loss', formulaSex: null, confirmBelowFloor: false },
      meals,
      tips: [],
      aiRecommendationId: id,
    };
    const saved = await api.request('PUT', `/coach/trainees/${trainee.id}/nutrition-plan`, { token: coach.token, body });
    expect(saved.status).toBe(200);
    expect(saved.body.plan.aiRecommendationId).toBe(id);
    expect(saved.body.issues.filter((issue: { severity: string }) => issue.severity === 'error')).toEqual([]);
    expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan).toBeNull();

    // Only the coach's publish reaches her, without the link.
    expect((await api.request('POST', `/coach/trainees/${trainee.id}/nutrition-plan/publish`, { token: coach.token })).status).toBe(200);
    const view = await api.request('GET', '/nutrition-plan', { token: trainee.token });
    expect(view.body.plan.version).toBe(1);
    expect(JSON.stringify(view.body)).not.toContain(id);
    const version = await NutritionPlanVersion.findOne({ traineeId: trainee.user._id }).lean();
    expect(JSON.stringify(version)).not.toContain(id);

    // A link must be a ready nutrition draft of this trainee; null clears it.
    const training = await AiRecommendation.create({ traineeId: trainee.user._id, coachId: coach.user._id, type: 'training_plan', status: 'ready', trigger: 'coach', active: false });
    const wrongType = await api.request('PUT', `/coach/trainees/${trainee.id}/nutrition-plan`, { token: coach.token, body: { ...body, aiRecommendationId: String(training._id) } });
    expect(wrongType.status).toBe(400);
    const cleared = await api.request('PUT', `/coach/trainees/${trainee.id}/nutrition-plan`, { token: coach.token, body: { ...body, aiRecommendationId: null } });
    expect(cleared.body.plan.aiRecommendationId).toBeNull();
    expect(await NutritionPlan.countDocuments({ traineeId: trainee.user._id, aiRecommendationId: null })).toBe(1);
  });
});
