import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { Template } from '../../templates/template.model';
import { FoodItem } from '../foodItem.model';
import { applyNutritionSeed, validateNutritionSeed } from '../nutritionSeed';
import type { NutritionSeedData } from '../nutritionSeed';

// seed:nutrition with a FAKE fixture — the coach's real food lists are never committed. The items become
// system items of the food bank (owner 2026-10-28); a template goes to the coach given for it.

function fixture(): NutritionSeedData {
  return {
    seedKeyPrefix: 'test-lists-a',
    foods: [
      { key: 'p1', group: 'protein', name: 'Fake protein', portion: '100 g', grams: 100, isNew: false, dietTags: ['dairy'] },
      { key: 'p2', group: 'protein', name: 'Fake eggs', portion: '2 units', grams: null, isNew: true, dietTags: ['eggs'] },
      { key: 'c1', group: 'carb', name: 'Fake bread', portion: '3 slices', grams: null, isNew: false, dietTags: ['gluten'] },
      { key: 'f1', group: 'fat', name: 'Fake oil', portion: '2 tsp', grams: null, isNew: false, dietTags: [] },
    ],
    template: {
      key: 'template',
      name: 'Fake 1,500',
      targetKcal: 1500,
      tips: ['Fake tip'],
      meals: [
        {
          name: 'Fake dinner',
          portions: { protein: 1.5, carb: 1, fat: 1 },
          vegetablesFree: true,
          options: [
            {
              label: 'A',
              lines: [
                { food: 'p1', portions: 1 },
                { food: 'p2', portions: 0.5 },
                { food: 'c1', portions: 1 },
                { food: 'f1', portions: 1 },
                { text: 'Big salad', group: 'vegetable' },
                { text: 'Fake patties', group: 'protein', portions: 2 },
              ],
            },
          ],
        },
      ],
    },
  };
}

describe('nutrition seed', () => {
  const coachId = String(new Types.ObjectId());
  const seed = (data: NutritionSeedData) => applyNutritionSeed(data, { templateCoachId: coachId });

  beforeAll(connectTestDatabase);
  afterAll(disconnectTestDatabase);
  beforeEach(async () => {
    await clearTestDatabase();
    await Promise.all([FoodItem.init(), Template.init()]);
  });

  it('creates the items (no kcal, in order) and the template; re-running changes nothing', async () => {
    expect(await seed(fixture())).toEqual({ foodsCreated: 4, foodsKept: 0, categoriesFilled: 0, templateCreated: true });

    const items = await FoodItem.find({ scope: 'system' }).sort({ group: 1, order: 1 }).lean();
    expect(items.map((item) => [item.group, item.name, item.order, item.kcal, item.isNewItem])).toEqual([
      ['carb', 'Fake bread', 0, null, false],
      ['fat', 'Fake oil', 0, null, false],
      ['protein', 'Fake protein', 0, null, false],
      ['protein', 'Fake eggs', 1, null, true],
    ]);

    const template = await Template.findOne({ coachId }).lean();
    const lines = template!.nutrition!.meals[0].options[0].lines;
    expect(template).toMatchObject({ type: 'nutrition_plan', name: 'Fake 1,500', nutrition: { targetKcal: 1500 } });
    expect(lines.map((line) => [line.kind, line.group, line.portions])).toEqual([
      ['food', 'protein', 1],
      ['food', 'protein', 0.5],
      ['food', 'carb', 1],
      ['food', 'fat', 1],
      ['text', 'vegetable', null],
      ['text', 'protein', 2],
    ]);

    // System items with a unique key, no coach.
    expect(items.every((item) => item.coachId === null && item.itemKey?.startsWith('test-lists-a:'))).toBe(true);

    // The admin edits an item; a re-run keeps the edit and adds nothing.
    await FoodItem.updateOne({ scope: 'system', name: 'Fake oil' }, { $set: { name: 'Olive oil' } });
    expect(await seed(fixture())).toEqual({ foodsCreated: 0, foodsKept: 4, categoriesFilled: 0, templateCreated: false });
    expect(await FoodItem.countDocuments({ scope: 'system' })).toBe(4);
    expect(await FoodItem.exists({ scope: 'system', name: 'Olive oil' })).not.toBeNull();
    expect(await Template.countDocuments({ coachId })).toBe(1);
  });

  it('a food-list file (13a+): no template, snack items, archived items, appended after her items; a re-run adds only missing ones', async () => {
    await seed(fixture());
    const lists = (foods: NutritionSeedData['foods']): NutritionSeedData => ({ seedKeyPrefix: 'test-lists', foods });
    const first: NutritionSeedData['foods'] = [
      { key: 'protein:fish', group: 'protein', name: 'Fake fish', portion: '100 g', grams: 100, isNew: false, dietTags: ['fish'] },
      { key: 'protein:almond-milk', group: 'protein', name: 'Fake almond milk', portion: '1 l', grams: null, isNew: false, dietTags: ['tree_nuts'], archived: true },
      { key: 'snack:bamba', group: 'snack', name: 'Fake bamba', portion: '28 g', grams: 28, isNew: false, dietTags: ['peanuts'] },
    ];
    expect(await seed(lists(first))).toMatchObject({ foodsCreated: 3, foodsKept: 0, templateCreated: null });

    const fish = await FoodItem.findOne({ scope: 'system', name: 'Fake fish' }).lean();
    expect(fish?.order).toBe(2); // after the first file's two protein items (orders 0, 1)
    expect((await FoodItem.findOne({ scope: 'system', name: 'Fake almond milk' }).lean())?.archivedAt).toBeInstanceOf(Date);
    expect((await FoodItem.findOne({ scope: 'system', name: 'Fake bamba' }).lean())).toMatchObject({ group: 'snack', order: 0, archivedAt: null });

    // The coach restores the archived item; the full file later adds one more — nothing else changes.
    await FoodItem.updateOne({ scope: 'system', name: 'Fake almond milk' }, { $set: { archivedAt: null } });
    const more = [...first, { key: 'protein:chicken', group: 'protein' as const, name: 'Fake chicken', portion: '90 g', grams: 90, isNew: false, dietTags: ['poultry' as const] }];
    expect(await seed(lists(more))).toMatchObject({ foodsCreated: 1, foodsKept: 3 });
    expect((await FoodItem.findOne({ scope: 'system', name: 'Fake almond milk' }).lean())?.archivedAt).toBeNull();
    expect((await FoodItem.findOne({ scope: 'system', name: 'Fake chicken' }).lean())?.order).toBe(4);
    expect(await Template.countDocuments({ coachId })).toBe(1);
  });

  it('categories (13a+): set on new items; an existing item gets one only while it has none', async () => {
    const lists = (foods: NutritionSeedData['foods']): NutritionSeedData => ({ seedKeyPrefix: 'test-cat', foods });
    const plain: NutritionSeedData['foods'] = [
      { key: 'a', group: 'protein', name: 'Fake A', portion: '1', grams: null, isNew: false, dietTags: [] },
      { key: 'b', group: 'protein', name: 'Fake B', portion: '1', grams: null, isNew: false, dietTags: [] },
    ];
    await seed(lists(plain));
    await FoodItem.updateOne({ scope: 'system', name: 'Fake B' }, { $set: { category: 'meat' } }); // her own choice
    const withCategories = plain.map((food) => ({ ...food, category: 'dairy' as const }));
    expect(await seed(lists(withCategories))).toMatchObject({ foodsCreated: 0, categoriesFilled: 1 });
    expect((await FoodItem.findOne({ scope: 'system', name: 'Fake A' }).lean())?.category).toBe('dairy');
    expect((await FoodItem.findOne({ scope: 'system', name: 'Fake B' }).lean())?.category).toBe('meat');
    expect((await seed(lists(withCategories))).categoriesFilled).toBe(0);
    expect(validateNutritionSeed(lists([{ ...plain[0], category: 'fruits' }])).join(' ')).toMatch(/not in the protein group/);
  });

  it('without a coach (a fresh database): only the system items, the template is skipped', async () => {
    expect(await applyNutritionSeed(fixture())).toEqual({ foodsCreated: 4, foodsKept: 0, categoriesFilled: 0, templateCreated: null });
    expect(await Template.countDocuments()).toBe(0);
    expect(await applyNutritionSeed(fixture())).toMatchObject({ foodsCreated: 0, foodsKept: 4 });
    expect(await FoodItem.countDocuments({ scope: 'system' })).toBe(4);
  });

  it('refuses a broken file before writing anything', async () => {
    const broken = fixture();
    broken.template!.meals[0].options[0].lines.push({ food: 'missing', portions: 1 });
    broken.foods[0].dietTags = ['bacon' as never];
    broken.foods[1].portion = "2 units (one = 70 קלוריות)";
    expect(validateNutritionSeed(broken)).toHaveLength(3);
    expect(validateNutritionSeed(broken).join(' ')).toMatch(/mention calories/);
    await expect(seed(broken)).rejects.toThrow(/not valid/);
    expect(await FoodItem.countDocuments()).toBe(0);
  });
});
