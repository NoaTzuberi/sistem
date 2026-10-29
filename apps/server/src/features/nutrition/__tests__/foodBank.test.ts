import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FoodItem as ApiFoodItem } from '@sistem/types';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { Notification } from '../../notifications/notification.model';
import { OnboardingResponse } from '../../onboarding/onboardingResponse.model';
import { Template } from '../../templates/template.model';
import { FoodItem } from '../foodItem.model';
import { NutritionPlan, NutritionPlanVersion } from '../nutritionPlan.model';
import { mergeFoodBank } from '../foodBank';
import { migrateFoodBank } from '../foodBankMigration';

// The app-wide food bank (owner 2026-10-28): system items for everyone + each coach's own items;
// copy-on-write edits, restore to original, hide; only the admin writes system items; the one-time migration.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

function food(id: string, extra: Partial<ApiFoodItem> = {}): ApiFoodItem {
  return {
    id,
    group: 'protein',
    name: id,
    portion: '1',
    grams: null,
    kcal: null,
    isNew: false,
    dietTags: [],
    category: null,
    order: 0,
    archivedAt: null,
    source: 'system',
    basedOn: null,
    hidden: false,
    ...extra,
  };
}

describe('mergeFoodBank (pure)', () => {
  const system = [food('s1', { order: 1 }), food('s2', { order: 2 }), food('s3', { order: 3 }), food('s4', { archivedAt: '2026-01-01T00:00:00Z' })];

  it('system − replaced − hidden − archived + her own', () => {
    const own = [food('copy-of-s1', { source: 'mine', basedOn: 's1', order: 1 }), food('mine', { source: 'mine', order: 9 })];
    const merged = mergeFoodBank(system, own, new Set(['s2']));
    expect(merged.map((item) => item.id)).toEqual(['copy-of-s1', 's3', 'mine']);
  });

  it('her library shows hidden items flagged; an archived copy replaces nothing and is not listed', () => {
    const own = [food('old-copy', { source: 'mine', basedOn: 's1', archivedAt: '2026-01-01T00:00:00Z' })];
    const merged = mergeFoodBank(system, own, new Set(['s2']), { includeHidden: true });
    expect(merged.map((item) => [item.id, item.hidden])).toEqual([
      ['s1', false],
      ['s2', true],
      ['s3', false],
    ]);
  });
});

describe('food bank (API)', () => {
  let api: ApiTestClient;
  let admin: TestUser;
  let coach: TestUser;
  let otherCoach: TestUser;
  let trainee: TestUser;
  let loneTrainee: TestUser;
  let chicken: ApiFoodItem;
  let rice: ApiFoodItem;

  const foodsOf = async (user: TestUser) => (await api.request('GET', '/coach/nutrition/foods', { token: user.token })).body.items as ApiFoodItem[];
  const planPath = () => `/coach/trainees/${trainee.id}/nutrition-plan`;

  async function adminCreate(body: Record<string, unknown>) {
    const res = await api.request('POST', '/admin/foods', { token: admin.token, body });
    expect(res.status).toBe(201);
    return res.body.item as ApiFoodItem;
  }

  async function savePlanWith(foodItemId: string) {
    const res = await api.request('PUT', planPath(), {
      token: coach.token,
      body: {
        tips: [],
        calorieTarget: { kcal: 1500, source: 'override', goal: 'fat_loss', formulaSex: null, confirmBelowFloor: false },
        mode: 'menu',
        meals: [
          {
            name: 'Lunch',
            portions: { protein: 1, carb: 0, fat: 0, snack: 0 },
            vegetablesFree: true,
            options: [{ label: 'A', lines: [{ kind: 'food', foodItemId, portions: 1 }] }],
          },
        ],
      },
    });
    expect(res.status).toBe(200);
  }

  async function planLineId(): Promise<string> {
    const plan = await NutritionPlan.findOne({ traineeId: trainee.user._id }).lean();
    return String(plan!.meals[0].options[0].lines[0].foodItemId);
  }

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
    admin = await createTestUser('admin@example.com', { roles: ['admin'] });
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    otherCoach = await createTestUser('other@example.com', { role: 'coach' });
    const onboarded = { onboardingStatus: 'completed' as const, onboardingCompletedAt: new Date() };
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id, ...onboarded });
    loneTrainee = await createTestUser('noa@example.com', onboarded);
    await OnboardingResponse.create({
      userId: trainee.user._id,
      completedAt: new Date(),
      answers: { birthDate: new Date('1995-04-12T00:00:00Z'), height: 165, weight: 70, gender: 'female', goals: ['lose_weight'] },
    });
    chicken = await adminCreate({ group: 'protein', name: 'Chicken', portion: '100 g', grams: 100, dietTags: ['poultry'] });
    rice = await adminCreate({ group: 'carb', name: 'Rice', portion: '1/2 cup' });
  });

  it('a new coach sees the whole bank at once; her own items only she sees', async () => {
    expect((await foodsOf(otherCoach)).map((item) => [item.name, item.source])).toEqual([
      ['Rice', 'system'],
      ['Chicken', 'system'],
    ]);
    const own = await api.request('POST', '/coach/nutrition/foods', { token: coach.token, body: { group: 'protein', name: 'Tofu', portion: '150 g' } });
    expect(own.body.item).toMatchObject({ source: 'mine', basedOn: null });
    expect((await foodsOf(coach)).map((item) => item.name)).toContain('Tofu');
    expect((await foodsOf(otherCoach)).map((item) => item.name)).not.toContain('Tofu');
    // Another coach can't edit, remove or restore it.
    const path = `/coach/nutrition/foods/${own.body.item.id}`;
    expect((await api.request('PATCH', path, { token: otherCoach.token, body: { name: 'X' } })).status).toBe(404);
    expect((await api.request('DELETE', path, { token: otherCoach.token })).status).toBe(404);
  });

  it('copy-on-write: her edit makes her own copy; the system item and other coaches never change', async () => {
    await savePlanWith(chicken.id);
    const res = await api.request('PATCH', `/coach/nutrition/foods/${chicken.id}`, { token: coach.token, body: { name: 'Chicken breast' } });
    expect(res.status).toBe(200);
    const copy = res.body.item as ApiFoodItem;
    expect(copy).toMatchObject({ source: 'mine', basedOn: chicken.id, name: 'Chicken breast', portion: '100 g', dietTags: ['poultry'] });
    expect(copy.id).not.toBe(chicken.id);

    expect((await FoodItem.findById(chicken.id).lean())?.name).toBe('Chicken');
    expect((await foodsOf(coach)).map((item) => item.name)).toEqual(['Rice', 'Chicken breast']);
    expect((await foodsOf(otherCoach)).map((item) => item.name)).toEqual(['Rice', 'Chicken']);
    // Her working copy now uses her copy.
    expect(await planLineId()).toBe(copy.id);

    // A second edit (of the original or the copy) updates the same copy.
    await api.request('PATCH', `/coach/nutrition/foods/${chicken.id}`, { token: coach.token, body: { portion: '120 g' } });
    expect(await FoodItem.countDocuments({ basedOn: chicken.id })).toBe(1);
    expect((await FoodItem.findById(copy.id).lean())?.portion).toBe('120 g');
    // Her kcal caps still apply to her copy.
    expect((await api.request('PATCH', `/coach/nutrition/foods/${chicken.id}`, { token: coach.token, body: { kcal: 999 } })).status).toBe(400);
  });

  it('restore to original: her plans point back; a copy a published version shows is archived, not deleted', async () => {
    await savePlanWith(chicken.id);
    const copy = (await api.request('PATCH', `/coach/nutrition/foods/${chicken.id}`, { token: coach.token, body: { name: 'Mine' } })).body.item as ApiFoodItem;
    expect((await api.request('POST', `${planPath()}/publish`, { token: coach.token })).status).toBe(200);
    expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.plan.swaps.protein.map((item: { name: string }) => item.name)).toEqual(['Mine']);

    const reverted = await api.request('DELETE', `/coach/nutrition/foods/${copy.id}`, { token: coach.token });
    expect(reverted.body.outcome).toBe('reverted');
    expect(await planLineId()).toBe(chicken.id);
    expect((await FoodItem.findById(copy.id).lean())?.archivedAt).toBeInstanceOf(Date);
    expect((await foodsOf(coach)).map((item) => [item.name, item.source])).toEqual([
      ['Rice', 'system'],
      ['Chicken', 'system'],
    ]);
    // The archived copy can't be brought back over the original.
    expect((await api.request('POST', `/coach/nutrition/foods/${copy.id}/restore`, { token: coach.token })).status).toBe(404);

    // An unused copy is simply deleted.
    const unused = (await api.request('PATCH', `/coach/nutrition/foods/${rice.id}`, { token: coach.token, body: { name: 'Brown rice' } })).body.item;
    expect((await api.request('DELETE', `/coach/nutrition/foods/${unused.id}`, { token: coach.token })).body.outcome).toBe('reverted');
    expect(await FoodItem.exists({ _id: unused.id })).toBeNull();
  });

  it('hide: out of her lists (builder, trainee swaps), flagged in her library, back on unhide; system items are never removed by a coach', async () => {
    const hide = await api.request('POST', `/coach/nutrition/foods/${rice.id}/hidden`, { token: coach.token });
    expect(hide.body.item).toMatchObject({ id: rice.id, hidden: true });
    expect((await foodsOf(coach)).find((item) => item.id === rice.id)?.hidden).toBe(true);
    const builder = await api.request('GET', planPath(), { token: coach.token });
    expect(builder.body.foods.map((item: ApiFoodItem) => item.id)).toEqual([chicken.id]);
    expect((await api.request('GET', '/nutrition-plan', { token: trainee.token })).body.swaps.carb).toEqual([]);
    // Others still see it.
    expect((await foodsOf(otherCoach)).find((item) => item.id === rice.id)?.hidden).toBe(false);

    await api.request('DELETE', `/coach/nutrition/foods/${rice.id}/hidden`, { token: coach.token });
    expect((await foodsOf(coach)).find((item) => item.id === rice.id)?.hidden).toBe(false);

    expect((await api.request('DELETE', `/coach/nutrition/foods/${rice.id}`, { token: coach.token })).status).toBe(404);
    expect(await FoodItem.exists({ _id: rice.id })).not.toBeNull();
    // Only system items can be hidden.
    const own = (await api.request('POST', '/coach/nutrition/foods', { token: coach.token, body: { group: 'fat', name: 'Oil', portion: '1 tsp' } })).body.item;
    expect((await api.request('POST', `/coach/nutrition/foods/${own.id}/hidden`, { token: coach.token })).status).toBe(404);
  });

  it('only the admin writes system items (server-side)', async () => {
    for (const user of [coach, trainee]) {
      expect((await api.request('GET', '/admin/foods', { token: user.token })).status).toBe(403);
      expect((await api.request('POST', '/admin/foods', { token: user.token, body: { group: 'fat', name: 'X', portion: '1' } })).status).toBe(403);
      expect((await api.request('PATCH', `/admin/foods/${chicken.id}`, { token: user.token, body: { name: 'X' } })).status).toBe(403);
      expect((await api.request('DELETE', `/admin/foods/${chicken.id}`, { token: user.token })).status).toBe(403);
    }
    const list = await api.request('GET', '/admin/foods', { token: admin.token });
    expect(list.body.items.map((item: ApiFoodItem) => item.name)).toEqual(['Rice', 'Chicken']);
    expect(list.body.config.groupKcal.protein).toBeGreaterThan(0);

    expect((await api.request('PATCH', `/admin/foods/${chicken.id}`, { token: admin.token, body: { name: 'Chicken thigh' } })).body.item.name).toBe('Chicken thigh');
    expect((await foodsOf(coach)).map((item) => item.name)).toContain('Chicken thigh');
    // A system item a coach copied is archived (her copy still points at it), an unused one deleted.
    await api.request('PATCH', `/coach/nutrition/foods/${chicken.id}`, { token: coach.token, body: { name: 'Mine' } });
    expect((await api.request('DELETE', `/admin/foods/${chicken.id}`, { token: admin.token })).body.outcome).toBe('archived');
    expect((await api.request('DELETE', `/admin/foods/${rice.id}`, { token: admin.token })).body.outcome).toBe('deleted');
    expect((await foodsOf(otherCoach)).map((item) => item.name)).toEqual([]);
    expect((await api.request('POST', `/admin/foods/${chicken.id}/restore`, { token: admin.token })).body.item.archivedAt).toBeNull();
    // Admin items get a unique key.
    expect((await FoodItem.findById(chicken.id).lean())?.itemKey).toMatch(/^admin:/);
  });

  it("her food sheet without a plan: her coach's lists, or the system bank when she has no coach", async () => {
    await api.request('PATCH', `/coach/nutrition/foods/${chicken.id}`, { token: coach.token, body: { name: 'Coach chicken' } });
    const withCoach = await api.request('GET', '/nutrition-plan', { token: trainee.token });
    expect(withCoach.body.plan).toBeNull();
    expect(withCoach.body.swaps.protein.map((item: { name: string }) => item.name)).toEqual(['Coach chicken']);
    // No calories reach her.
    expect(JSON.stringify(withCoach.body.swaps)).not.toMatch(/kcal/);

    const alone = await api.request('GET', '/nutrition-plan', { token: loneTrainee.token });
    expect(alone.body.swaps.protein.map((item: { name: string }) => item.name)).toEqual(['Chicken']);
    expect(alone.body.swaps.carb.map((item: { name: string }) => item.name)).toEqual(['Rice']);
  });

  it('migration: one coach’s items become system items in place (same ids, plans keep resolving); dry run writes nothing; idempotent', async () => {
    await FoodItem.deleteMany({});
    const legacy = await FoodItem.create([
      { coachId: coach.user._id, group: 'protein', name: 'Eggs', portion: '2', seedKey: 'lists:eggs', order: 0 },
      { coachId: coach.user._id, group: 'carb', name: 'Bread', portion: '2 slices', seedKey: 'lists:bread', order: 0 },
      { coachId: coach.user._id, group: 'fat', name: 'Her own oil', portion: '1 tsp', order: 0 },
      // Another coach's unchanged copy of one of them, and a changed one.
      { coachId: otherCoach.user._id, group: 'protein', name: 'Eggs', portion: '2', seedKey: 'lists:eggs', order: 0 },
      { coachId: otherCoach.user._id, group: 'carb', name: 'Rye bread', portion: '2 slices', seedKey: 'lists:bread', order: 0 },
    ]);
    await savePlanWith(String(legacy[0]._id));

    const dry = await migrateFoodBank({ sourceCoachId: coach.id, apply: false });
    expect(dry).toMatchObject({ sourceItems: 3, converted: 3, skippedAlreadySystem: 0, applied: false });
    expect(dry.unchangedDuplicates.map((item) => item.itemKey)).toEqual(['lists:eggs']);
    expect(await FoodItem.countDocuments({ scope: 'system' })).toBe(0);

    const applied = await migrateFoodBank({ sourceCoachId: coach.id, apply: true });
    expect(applied).toMatchObject({ converted: 3, applied: true });
    expect(applied.unchangedDuplicates.map((item) => item.foodId)).toEqual([String(legacy[3]._id)]);
    const eggs = await FoodItem.findById(legacy[0]._id).lean();
    expect(eggs).toMatchObject({ scope: 'system', itemKey: 'lists:eggs' });
    expect(eggs?.coachId ?? null).toBeNull();
    expect((await FoodItem.findById(legacy[2]._id).lean())?.itemKey).toBe(`migrated:${String(legacy[2]._id)}`);
    // The other coach's items stay hers.
    expect(await FoodItem.countDocuments({ coachId: otherCoach.user._id })).toBe(2);

    // Her plan still resolves the same id, and every coach now sees the bank.
    const builder = await api.request('GET', planPath(), { token: coach.token });
    expect(builder.body.issues.filter((issue: { code: string }) => issue.code === 'food_missing')).toEqual([]);
    expect((await foodsOf(otherCoach)).filter((item) => item.source === 'system')).toHaveLength(3);

    expect(await migrateFoodBank({ sourceCoachId: coach.id, apply: true })).toMatchObject({ sourceItems: 0, converted: 0 });
    expect(await FoodItem.countDocuments({ scope: 'system' })).toBe(3);
  });
});
