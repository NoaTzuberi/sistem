import type {
  CalculationOverrides,
  CalorieTargetSource,
  CoachNutritionPlan,
  FoodGroup,
  FormulaSex,
  NutritionGoal,
  NutritionLineKind,
  NutritionPlanMode,
  PortionCounts,
  PortionGroup,
  SaveNutritionPlanPayload,
} from '@sistem/types';

// The editable nutrition plan and pure functions over it. No rule about what a valid plan
// is lives here — the server decides and answers with issues (and the kcal).

export interface DraftLine {
  key: string;
  id?: string;
  kind: NutritionLineKind;
  foodItemId?: string;
  recipeId?: string;
  group: FoodGroup | null;
  portions: number | null;
  text: string;
}

export interface DraftOption {
  key: string;
  id?: string;
  label: string;
  lines: DraftLine[];
}

export interface DraftMeal {
  key: string;
  id?: string;
  name: string;
  portions: PortionCounts;
  vegetablesFree: boolean;
  options: DraftOption[];
}

export interface DraftTip {
  key: string;
  id?: string;
  text: string;
}

export interface NutritionDraft {
  target: {
    kcal: number | undefined;
    source: CalorieTargetSource | null;
    goal: NutritionGoal;
    formulaSex: FormulaSex | null;
    /** The coach's own values in the calculation summary (13a+); null = her data. */
    overrides: CalculationOverrides;
    confirmBelowFloor: boolean;
  };
  /** What she gets (owner, 2026-10-20): daily portions, or meals with options. Both are kept. */
  mode: NutritionPlanMode;
  /** Portions mode's day; all 0 = not set yet (filled from the recommendation once there is one). */
  dailyPortions: PortionCounts;
  /** Portions mode: vegetables free at every meal. */
  vegetablesFree: boolean;
  meals: DraftMeal[];
  tips: DraftTip[];
  /** The note at the top of her Nutrition tab (13a+); '' = none. */
  introMessage: string;
  /** The AI draft the meals were loaded from (13c, coach-only); null = none. */
  aiRecommendationId: string | null;
}

export const NO_OVERRIDES: CalculationOverrides = {
  weightKg: null,
  heightCm: null,
  ageYears: null,
  activityFactor: null,
  targetWeightKg: null,
  timelineWeeks: null,
};

export const NO_PORTIONS: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };

export function newKey(): string {
  return crypto.randomUUID();
}

// The default meals of a new plan (PRD §5.6). Their placeholder names come from the copy in the coach's
// language (Phase 15); once saved they are her own text.
const DEFAULT_MEALS: { key: DefaultMealKey; portions: PortionCounts }[] = [
  { key: 'breakfast', portions: { protein: 1, carb: 1, fat: 1, snack: 0 } },
  { key: 'lunch', portions: { protein: 1, carb: 1, fat: 1, snack: 0 } },
  { key: 'snack', portions: { protein: 0, carb: 1, fat: 1, snack: 0 } },
  { key: 'dinner', portions: { protein: 1, carb: 1, fat: 1, snack: 0 } },
];

type DefaultMealKey = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export function emptyDraft(goal: NutritionGoal, mealNames: Record<DefaultMealKey, string>): NutritionDraft {
  return {
    target: { kcal: undefined, source: null, goal, formulaSex: null, overrides: { ...NO_OVERRIDES }, confirmBelowFloor: false },
    // A new plan starts as daily portions (owner, 2026-10-20); the meals are there for menu mode.
    mode: 'portions',
    dailyPortions: { ...NO_PORTIONS },
    vegetablesFree: false,
    meals: DEFAULT_MEALS.map((meal) => newMeal(mealNames[meal.key], meal.portions)),
    tips: [],
    introMessage: '',
    aiRecommendationId: null,
  };
}

export function draftFromPlan(plan: CoachNutritionPlan): NutritionDraft {
  const target = plan.calorieTarget;
  return {
    target: {
      kcal: target.kcal ?? undefined,
      source: target.source,
      goal: target.goal,
      formulaSex: target.formulaSex,
      overrides: { ...NO_OVERRIDES, ...target.overrides },
      confirmBelowFloor: target.floorConfirmation !== null && target.floorConfirmation.kcal === target.kcal,
    },
    introMessage: plan.introMessage ?? '',
    aiRecommendationId: plan.aiRecommendationId,
    mode: plan.mode,
    dailyPortions: { ...plan.dailyPortions },
    vegetablesFree: plan.vegetablesFree,
    meals: plan.meals.map((meal) => ({
      key: newKey(),
      id: meal.id,
      name: meal.name,
      portions: { ...meal.portions },
      vegetablesFree: meal.vegetablesFree,
      options: meal.options.map((option) => ({
        key: newKey(),
        id: option.id,
        label: option.label,
        lines: option.lines.map((line) => ({
          key: newKey(),
          id: line.id,
          kind: line.kind,
          foodItemId: line.foodItemId,
          recipeId: line.recipeId,
          group: line.group,
          portions: line.portions,
          text: line.text ?? '',
        })),
      })),
    })),
    tips: plan.tips.map((tip) => ({ key: newKey(), id: tip.id, text: tip.text })),
  };
}

// A text line or tip she has not typed yet is not sent (the server needs text) — it is
// saved with the first save after she types. keysOf() skips the same rows, so saved ids
// still line up by position.
function isSendableLine(line: DraftLine): boolean {
  return line.kind !== 'text' || line.text.trim().length > 0;
}

function isSendableTip(tip: DraftTip): boolean {
  return tip.text.trim().length > 0;
}

export function toPayload(draft: NutritionDraft): SaveNutritionPlanPayload {
  const kcal = draft.target.kcal ?? null;
  return {
    calorieTarget: {
      kcal,
      source: kcal === null ? null : (draft.target.source ?? 'override'),
      goal: draft.target.goal,
      formulaSex: draft.target.formulaSex,
      overrides: draft.target.overrides,
      confirmBelowFloor: draft.target.confirmBelowFloor,
    },
    introMessage: draft.introMessage.trim() ? draft.introMessage : null,
    mode: draft.mode,
    dailyPortions: draft.dailyPortions,
    vegetablesFree: draft.vegetablesFree,
    meals: draft.meals.map((meal) => ({
      id: meal.id,
      name: meal.name,
      portions: meal.portions,
      vegetablesFree: meal.vegetablesFree,
      options: meal.options.map((option) => ({
        id: option.id,
        label: option.label,
        lines: option.lines.filter(isSendableLine).map((line) =>
          line.kind === 'food'
            ? { id: line.id, kind: 'food' as const, foodItemId: line.foodItemId, portions: line.portions }
            : line.kind === 'recipe'
              ? { id: line.id, kind: 'recipe' as const, recipeId: line.recipeId, portions: line.portions }
              : { id: line.id, kind: 'text' as const, text: line.text, group: line.group, portions: line.portions },
        ),
      })),
    })),
    tips: draft.tips.filter(isSendableTip).map((tip) => ({ id: tip.id, text: tip.text })),
    aiRecommendationId: draft.aiRecommendationId,
  };
}

interface SentKeys {
  meals: { key: string; options: { key: string; lines: string[] }[] }[];
  tips: string[];
}

export function keysOf(draft: NutritionDraft): SentKeys {
  return {
    meals: draft.meals.map((meal) => ({
      key: meal.key,
      options: meal.options.map((option) => ({ key: option.key, lines: option.lines.filter(isSendableLine).map((line) => line.key) })),
    })),
    tips: draft.tips.filter(isSendableTip).map((tip) => tip.key),
  };
}

/**
 * Gives new rows the ids the server stored for them. `sent` is the draft as it was sent
 * (the response keeps its order), so this also works on a draft edited meanwhile.
 */
export function assignSavedIds(draft: NutritionDraft, sent: SentKeys, saved: CoachNutritionPlan): NutritionDraft {
  const ids = new Map<string, string>();
  sent.meals.forEach((meal, mealIndex) => {
    const savedMeal = saved.meals[mealIndex];
    if (!savedMeal) return;
    ids.set(meal.key, savedMeal.id);
    meal.options.forEach((option, optionIndex) => {
      const savedOption = savedMeal.options[optionIndex];
      if (!savedOption) return;
      ids.set(option.key, savedOption.id);
      option.lines.forEach((lineKey, lineIndex) => {
        const savedLine = savedOption.lines[lineIndex];
        if (savedLine) ids.set(lineKey, savedLine.id);
      });
    });
  });
  sent.tips.forEach((tipKey, index) => {
    const savedTip = saved.tips[index];
    if (savedTip) ids.set(tipKey, savedTip.id);
  });

  return {
    ...draft,
    meals: draft.meals.map((meal) => ({
      ...meal,
      id: ids.get(meal.key) ?? meal.id,
      options: meal.options.map((option) => ({
        ...option,
        id: ids.get(option.key) ?? option.id,
        lines: option.lines.map((line) => ({ ...line, id: ids.get(line.key) ?? line.id })),
      })),
    })),
    tips: draft.tips.map((tip) => ({ ...tip, id: ids.get(tip.key) ?? tip.id })),
  };
}

export function newMeal(name: string, portions: PortionCounts = { protein: 1, carb: 1, fat: 1, snack: 0 }): DraftMeal {
  return { key: newKey(), name, portions, vegetablesFree: false, options: [] };
}

export function newOption(label: string): DraftOption {
  return { key: newKey(), label, lines: [] };
}

/** "Duplicate option": a copy of its lines under a new label (new keys, no ids — saved as new rows). */
export function duplicateOption(option: DraftOption, label: string): DraftOption {
  return { key: newKey(), label, lines: option.lines.map((line) => ({ ...line, key: newKey(), id: undefined })) };
}

export function newFoodLine(foodItemId: string, group: FoodGroup): DraftLine {
  return { key: newKey(), kind: 'food', foodItemId, group, portions: 1, text: '' };
}

export function newTextLine(): DraftLine {
  return { key: newKey(), kind: 'text', group: null, portions: null, text: '' };
}

export function newTip(): DraftTip {
  return { key: newKey(), text: '' };
}

/**
 * The group a "+ Food item" in this option should open on: the first group the option's lines don't cover yet
 * (fewer portions than the meal plans), else the meal's first group with portions, else protein.
 */
export function neededGroup(meal: Pick<DraftMeal, 'portions'>, option: Pick<DraftOption, 'lines'>): PortionGroup {
  const covered = { protein: 0, carb: 0, fat: 0, snack: 0 } as Record<PortionGroup, number>;
  for (const line of option.lines) {
    if (line.group && line.group !== 'vegetable' && line.portions) covered[line.group] += line.portions;
  }
  const groups: PortionGroup[] = ['protein', 'carb', 'fat', 'snack'];
  return (
    groups.find((group) => meal.portions[group] > covered[group]) ??
    groups.find((group) => meal.portions[group] > 0) ??
    'protein'
  );
}

/** Moves one item of a list up (-1) or down (+1). */
export function move<T>(list: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
