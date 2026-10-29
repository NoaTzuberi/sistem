import { describe, it, expect } from 'vitest';
import type { DietTag, FoodGroup, FoodItem, NutritionPreferences, PortionCounts } from '@sistem/types';
import { DEFAULT_NUTRITION_CONFIG } from '../../nutrition/nutrition.config';
import { mealSlotNames } from '../nutritionPlan/nutritionPlan.constants';
import { selectFoods } from '../nutritionPlan/nutritionPlanFoods';
import type { FoodCandidate } from '../nutritionPlan/nutritionPlanFoods';
import { collectFreeText } from '../nutritionPlan/nutritionPlanProfile';
import { buildNutritionPlanSchema } from '../nutritionPlan/nutritionPlanPrompt';
import { checkNutritionPlanReply } from '../nutritionPlan/nutritionPlanValidation';
import type { NutritionPlanValidationContext } from '../nutritionPlan/nutritionPlanValidation';

// Phase 13c (PRD §5.6): the pure parts of the AI nutrition draft — the food filter that runs
// before the model sees anything, what is sent about her, and the validator of its reply.

let nextId = 0;
function food(group: FoodGroup, name: string, dietTags: DietTag[] = [], extra: Partial<FoodItem> = {}): FoodItem {
  nextId += 1;
  return {
    id: `food-${nextId}`,
    group,
    name,
    portion: '1 portion',
    grams: null,
    kcal: null,
    isNew: false,
    dietTags,
    category: null,
    order: nextId,
    archivedAt: null,
    source: 'mine',
    basedOn: null,
    hidden: false,
    ...extra,
  };
}

function preferences(patch: Partial<NutritionPreferences> = {}): NutritionPreferences {
  return { dietType: 'none', dietStyles: [], religious: [], intolerances: [], allergies: [], mealsPerDay: null, ...patch };
}

const DAY: PortionCounts = { protein: 2, carb: 2, fat: 2, snack: 0 };

const LIST = [
  food('protein', 'Chicken breast', ['poultry']),
  food('protein', 'Beef', ['meat']),
  food('protein', 'Pork loin', ['meat', 'pork']),
  food('protein', 'Salmon', ['fish']),
  food('protein', 'Shrimp', ['shellfish']),
  food('protein', 'Cottage cheese', ['dairy', 'lactose']),
  food('protein', 'Eggs', ['eggs']),
  food('protein', 'Tofu', ['soy']),
  food('protein', 'Old yogurt', ['dairy'], { archivedAt: '2026-10-01T00:00:00.000Z' }),
  food('carb', 'Bread', ['gluten']),
  food('carb', 'Rice'),
  food('fat', 'Almonds', ['tree_nuts']),
  food('fat', 'Olive oil'),
  food('snack', 'Chocolate', ['dairy']),
  food('vegetable', 'Cucumber'),
];

function sentNames(selection: ReturnType<typeof selectFoods>): string[] {
  return selection.candidates.map((candidate) => candidate.food.name);
}

describe('AI nutrition draft — the food filter (before the model)', () => {
  it('sends only active items of the groups the day needs, never vegetables or archived items', () => {
    const selection = selectFoods(LIST, null, DAY);
    expect(sentNames(selection)).not.toContain('Old yogurt');
    expect(sentNames(selection)).not.toContain('Cucumber');
    expect(sentNames(selection)).not.toContain('Chocolate');
    expect(selection.candidates[0].alias).toBe('F001');
    expect(selection.candidates.map((candidate) => candidate.food.group)).toEqual([
      ...Array(8).fill('protein'),
      'carb',
      'carb',
      'fat',
      'fat',
    ]);
    expect(selection.emptyGroups).toEqual([]);
  });

  it('sends snack items only when the computed day has snack portions', () => {
    expect(sentNames(selectFoods(LIST, null, { ...DAY, snack: 1 }))).toContain('Chocolate');
  });

  it.each([
    ['vegetarian', ['Chicken breast', 'Beef', 'Pork loin', 'Salmon', 'Shrimp']],
    ['pescatarian', ['Chicken breast', 'Beef', 'Pork loin']],
    ['vegan', ['Chicken breast', 'Beef', 'Pork loin', 'Salmon', 'Shrimp', 'Cottage cheese', 'Eggs']],
  ] as const)('filters by diet type: %s', (dietType, removed) => {
    const names = sentNames(selectFoods(LIST, preferences({ dietType }), DAY));
    for (const name of removed) expect(names).not.toContain(name);
    expect(names).toContain('Tofu');
  });

  it('filters kosher (pork, shellfish), lactose-free and each allergy tag, and counts what it removed', () => {
    const selection = selectFoods(
      LIST,
      preferences({ religious: [{ id: 'kosher' }], intolerances: [{ id: 'lactose_free' }], allergies: [{ id: 'tree_nuts' }, { id: 'gluten' }] }),
      DAY,
    );
    expect(sentNames(selection)).toEqual(['Chicken breast', 'Beef', 'Salmon', 'Eggs', 'Tofu', 'Rice', 'Olive oil']);
    expect(selection.counts.protein).toEqual({ sent: 5, filteredOut: 3 });
    expect(selection.counts.fat).toEqual({ sent: 1, filteredOut: 1 });
    expect(selection.excludedTags).toEqual(expect.arrayContaining(['pork', 'shellfish', 'lactose', 'tree_nuts', 'gluten']));
  });

  it('reports a group left empty by her restrictions', () => {
    const selection = selectFoods(LIST, preferences({ allergies: [{ id: 'tree_nuts' }] }), DAY);
    const onlyNuts = selectFoods(LIST.filter((item) => item.name !== 'Olive oil'), preferences({ allergies: [{ id: 'tree_nuts' }] }), DAY);
    expect(selection.emptyGroups).toEqual([]);
    expect(onlyNuts.emptyGroups).toEqual(['fat']);
  });
});

describe('AI nutrition draft — what is sent about her', () => {
  it('sends her own words cleaned, labelled by where she wrote them', () => {
    const texts = collectFreeText(
      preferences({
        intolerances: [{ id: 'lactose_free', details: 'Lactose ok in yogurt.' }],
        allergies: [{ id: 'other', details: 'Kiwi. Call 054-123-4567' }],
        foodsLoved: 'Hummus',
        foodsDisliked: 'Mushrooms, write to me@example.com',
      }),
    );
    expect(texts).toEqual([
      { source: 'intolerance:lactose_free', text: 'Lactose ok in yogurt.' },
      { source: 'allergy:other', text: 'Kiwi. Call [phone removed]' },
      { source: 'foods_loved', text: 'Hummus' },
      { source: 'foods_disliked', text: 'Mushrooms, write to [email removed]' },
    ]);
    expect(collectFreeText(null)).toEqual([]);
  });

  it('uses her meals-per-day answer for the meal slots, else the builder default of 4', () => {
    expect(mealSlotNames(null, 'en')).toHaveLength(4);
    expect(mealSlotNames(2, 'en')).toEqual(['Breakfast', 'Dinner']);
    expect(mealSlotNames(6, 'en')).toHaveLength(6);
  });

  it("writes the meal slots in the coach's language (Phase 15)", () => {
    expect(mealSlotNames(2, 'he')).toEqual(['ארוחת בוקר', 'ארוחת ערב']);
  });

  it('has a fixed schema without minItems / maxItems (Gemini rejects them)', () => {
    expect(JSON.stringify(buildNutritionPlanSchema())).not.toMatch(/minItems|maxItems/);
  });
});

describe('AI nutrition draft — the validator', () => {
  const chicken = food('protein', 'Chicken', ['poultry']);
  const cottage = food('protein', 'Cottage', ['dairy']);
  const tofu = food('protein', 'Tofu', ['soy']);
  const rice = food('carb', 'Rice');
  const oil = food('fat', 'Oil');
  const cheese = food('fat', 'Cheese', ['dairy']);
  const candidates: FoodCandidate[] = [chicken, cottage, tofu, rice, oil, cheese].map((item, index) => ({
    alias: `F00${index + 1}`,
    food: { ...item, group: item.group as 'protein' | 'carb' | 'fat' },
  }));
  const [CHICKEN, COTTAGE, TOFU, RICE, OIL, CHEESE] = candidates.map((candidate) => candidate.alias);

  function context(patch: Partial<NutritionPlanValidationContext> = {}): NutritionPlanValidationContext {
    return {
      coachId: 'coach',
      candidates,
      slots: ['Breakfast', 'Dinner'],
      language: 'en',
      dailyPortions: DAY,
      kcal: 720,
      preferences: preferences({ religious: [{ id: 'kosher' }] }),
      config: DEFAULT_NUTRITION_CONFIG,
      ...patch,
    };
  }

  const meal = (slot: string, options: { food: string; portions: number }[][]) => ({
    meal: slot,
    portions: { protein: 1, carb: 1, fat: 1, snack: 0 },
    vegetablesFree: true,
    why: 'Balanced.',
    options: options.map((lines) => ({ lines, why: 'Easy.' })),
  });

  function goodReply() {
    return {
      summary: 'She wants to lose weight.',
      considerations: ['Ask about mushrooms.'],
      meals: [
        meal('M1', [
          [{ food: COTTAGE, portions: 1 }, { food: RICE, portions: 1 }, { food: CHEESE, portions: 1 }],
          [{ food: TOFU, portions: 1 }, { food: RICE, portions: 1 }, { food: OIL, portions: 1 }],
        ]),
        meal('M2', [[{ food: CHICKEN, portions: 1 }, { food: RICE, portions: 1 }, { food: OIL, portions: 1 }]]),
      ],
    };
  }

  it('accepts a good reply: real ids, code-set names and labels, the computed numbers', () => {
    const result = checkNutritionPlanReply(goodReply(), context());
    expect(result.issues).toEqual([]);
    expect(result.value?.kcal).toBe(720);
    expect(result.value?.dailyPortions).toEqual(DAY);
    expect(result.value?.meals.map((m) => m.name)).toEqual(['Breakfast', 'Dinner']);
    expect(result.value?.meals[0].options.map((o) => o.label)).toEqual(['Option A', 'Option B']);
    expect(result.value?.meals[0].options[0].lines[0]).toEqual({ foodItemId: cottage.id, group: 'protein', portions: 1 });
  });

  it('rejects an alias that was not sent (an unknown or filtered-out food)', () => {
    const reply = goodReply();
    reply.meals[1].options[0].lines[0].food = 'F099';
    expect(checkNutritionPlanReply(reply, context()).issues).toContainEqual(expect.stringContaining('F099 is not in the food list'));
  });

  it('rejects a food used for the wrong group (the option no longer adds up to the meal)', () => {
    const reply = goodReply();
    reply.meals[1].options[0].lines[0].food = RICE; // a carb where protein was needed
    const { issues } = checkNutritionPlanReply(reply, context());
    expect(issues).toContainEqual(expect.stringContaining("must equal the meal's 1 protein · 1 carb · 1 fat · 0 snack"));
  });

  it('rejects meat / poultry with dairy in one option when she keeps kosher, and allows it otherwise', () => {
    const reply = goodReply();
    reply.meals[1].options[0].lines[2].food = CHEESE; // chicken + cheese
    expect(checkNutritionPlanReply(reply, context()).issues).toContainEqual(expect.stringContaining('she keeps kosher'));
    expect(checkNutritionPlanReply(reply, context({ preferences: null })).issues).toEqual([]);
  });

  it('rejects a missing meal and meals out of order', () => {
    const missing = goodReply();
    missing.meals.pop();
    expect(checkNutritionPlanReply(missing, context()).issues).toContainEqual(expect.stringContaining('Fill exactly 2 meals'));
    const swapped = goodReply();
    swapped.meals.reverse();
    expect(checkNutritionPlanReply(swapped, context()).issues).toContainEqual(expect.stringContaining('must be M1 (Breakfast)'));
  });

  it('rejects daily totals that differ from the computed portions, and snack portions it was not given', () => {
    const reply = goodReply();
    reply.meals[1].portions = { protein: 1.5, carb: 1, fat: 1, snack: 0 };
    reply.meals[1].options[0].lines[0].portions = 1.5;
    expect(checkNutritionPlanReply(reply, context()).issues).toEqual(['Daily protein portions add up to 2.5; they must be exactly 2.']);

    const snack = goodReply();
    snack.meals[1].portions = { protein: 1, carb: 1, fat: 1, snack: 1 };
    expect(checkNutritionPlanReply(snack, context()).issues).toContainEqual('Daily snack portions add up to 1; they must be exactly 0.');
  });

  it('rejects portions off the 0.5 steps, empty options and duplicate foods', () => {
    const reply = goodReply();
    reply.meals[0].options[0].lines[0].portions = 0.3;
    reply.meals[0].options[1].lines = [];
    reply.meals[1].options[0].lines.push({ food: OIL, portions: 1 });
    const { issues } = checkNutritionPlanReply(reply, context());
    expect(issues).toContainEqual(expect.stringContaining('steps of 0.5'));
    expect(issues).toContainEqual(expect.stringContaining('use 1 to 6 food lines; the reply has 0'));
    expect(issues).toContainEqual(expect.stringContaining('used twice'));
  });

  it('rejects a reply that is not the expected shape', () => {
    expect(checkNutritionPlanReply({ plan: [] }, context()).issues).toEqual(['The reply must be an object with a "meals" list.']);
  });
});
