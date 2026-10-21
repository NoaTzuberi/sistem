import type {
  DietTag,
  FoodCategory,
  FoodGroup,
  Language,
  MealLogDay,
  NutritionGoal,
  NutritionPreferences,
  NutritionViewLine,
  PortionCounts,
  PortionGroup,
  PreferenceItem,
  WeightGoal,
  WeightUnit,
} from '@sistem/types';
import { sharedCopy } from './copy';
import { fill, formatPlural } from './i18n/copy';
import { isolateAuto, isolateLtr } from './i18n/bidi';
import { formatNumber } from './i18n/intl';
import { formatDateOnly } from './format';
import { formatWeight } from './units';

// Read-only wording for nutrition (Phase 13a), shared by the dashboard builder, the
// trainee's Nutrition tab and coach mode. PLACEHOLDER wording — the owner sends the final
// copy (shared copy files, Phase 15). Coach content (food names,
// portions, meal names, tips) is always shown exactly as she wrote it.

export const PORTION_GROUPS: readonly PortionGroup[] = ['protein', 'carb', 'fat', 'snack'];
export const FOOD_GROUPS: readonly FoodGroup[] = ['protein', 'carb', 'fat', 'snack', 'vegetable'];

/**
 * Food categories per group, in display order (13a+: picker chips, food list filters) — mirrors the server's
 * FOOD_CATEGORY_IDS. Labels (shared copy) are PLACEHOLDERS.
 */
export const FOOD_CATEGORIES: Record<FoodGroup, readonly FoodCategory[]> = {
  protein: ['dairy', 'poultry', 'meat', 'fish_seafood', 'eggs', 'plant_based', 'supplements'],
  carb: ['grains_cereals', 'bread_crackers', 'fruits', 'legumes', 'starchy_vegetables'],
  fat: ['oils', 'nuts_seeds', 'spreads', 'other'],
  snack: ['sweet_cereals', 'chocolate', 'cookies_pastries', 'ice_cream', 'candy', 'salty', 'fast_food'],
  vegetable: [],
};

/** 'Protein', 'Vegetables' — a food group's name in the language on screen. */
export function foodGroupLabel(group: FoodGroup, language: Language): string {
  return sharedCopy[language].nutrition.groups[group];
}

export function foodCategoryLabel(category: FoodCategory, language: Language): string {
  return sharedCopy[language].nutrition.categories[category];
}

export function dietTagLabel(tag: DietTag, language: Language): string {
  return sharedCopy[language].nutrition.dietTags[tag];
}

export function nutritionGoalLabel(goal: NutritionGoal, language: Language): string {
  return sharedCopy[language].nutrition.goals[goal];
}

/** 0.5 → '½', 1.5 → '1½', 2 → '2'. Portions only ever go in halves. */
export function formatPortionCount(count: number): string {
  const whole = Math.floor(count);
  const half = count - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
}

/**
 * THE portion count inside a sentence: '4½' as one left-to-right unit, so Hebrew never shows it as
 * '½4' (½ is a neutral character that RTL text would move to the other side of the digit).
 */
export function formatPortionCountLtr(count: number): string {
  return isolateLtr(formatPortionCount(count));
}

/** '1 protein' */
export function describePortion(group: PortionGroup, count: number, language: Language): string {
  const copy = sharedCopy[language].nutrition;
  return fill(copy.portion, { count: formatPortionCountLtr(count), group: copy.portionWords[group] });
}

/** The groups a meal counts, in order, without the zeros. */
export function mealPortionList(portions: PortionCounts): { group: PortionGroup; count: number }[] {
  return PORTION_GROUPS.filter((group) => portions[group] > 0).map((group) => ({ group, count: portions[group] }));
}

/** '1 protein · 1 carb · 1 fat · vegetables free' (PRD §5.6). */
export function describeMealPortions(portions: PortionCounts, vegetablesFree: boolean, language: Language): string {
  const parts = mealPortionList(portions).map(({ group, count }) => describePortion(group, count, language));
  if (vegetablesFree) parts.push(sharedCopy[language].nutrition.vegetablesFree);
  return parts.join(' · ') || '—';
}

/**
 * How much of an item a line means: its portion as the coach wrote it, times the count
 * when it is not exactly one ('½ × 2 eggs').
 */
export function describePortionAmount(portion: string, count: number | null, language: Language): string {
  if (count === null || count === 1) return portion;
  return fill(sharedCopy[language].nutrition.portionAmount, { count: formatPortionCount(count), portion: isolateAuto(portion) });
}

/** A line of a meal option as the trainee reads it (name, amount; free text as written). */
export function describeViewLine(line: NutritionViewLine, language: Language): { title: string; detail: string | null } {
  if (line.food) return { title: line.food.name, detail: describePortionAmount(line.food.portion, line.portions, language) };
  const counted = line.group && line.group !== 'vegetable' && line.portions;
  return { title: line.text ?? '', detail: counted ? describePortion(line.group as PortionGroup, line.portions!, language) : null };
}

/** 'Lactose-free (ok in yogurt)', 'Other: kiwi' — an item with her own words. */
export function describePreferenceItem<T extends string>(item: PreferenceItem<T>, labels: Readonly<Record<T, string>>, language: Language): string {
  const label = labels[item.id] ?? item.id;
  if (!item.details) return label;
  return item.id === 'other' ? item.details : fill(sharedCopy[language].nutrition.itemWithDetails, { label, details: isolateAuto(item.details) });
}

function describeItems<T extends string>(items: readonly PreferenceItem<T>[], labels: Readonly<Record<T, string>>, language: Language): string {
  return items.map((item) => describePreferenceItem(item, labels, language)).join(sharedCopy[language].common.listSeparator);
}

export type NutritionPreferenceField = 'diet' | 'dietStyle' | 'religious' | 'intolerances' | 'allergies' | 'loves' | 'dislikes' | 'mealsPerDay';

/**
 * Her nutrition answers one field at a time, for tiles: value null = not answered (no diet
 * style / religious item, no free text, no meals-per-day preference). An empty intolerance or
 * allergy list is an answer ("None") — she went through the screen and chose none. null overall
 * = she skipped the screen.
 */
export function nutritionPreferenceFields(
  preferences: NutritionPreferences | null | undefined,
  language: Language,
): { id: NutritionPreferenceField; label: string; value: string | null }[] | null {
  if (!preferences) return null;
  const common = sharedCopy[language].common;
  const copy = sharedCopy[language].nutrition;
  const labels = copy.preferences;
  const diet = copy.dietTypes[preferences.dietType] ?? preferences.dietType;
  const text = (value: string | undefined) => value?.trim() || null;
  return [
    {
      id: 'diet',
      label: labels.diet,
      value: preferences.dietTypeDetails ? fill(copy.itemWithDetails, { label: diet, details: isolateAuto(preferences.dietTypeDetails) }) : diet,
    },
    { id: 'dietStyle', label: labels.dietStyle, value: describeItems(preferences.dietStyles, copy.dietStyles, language) || null },
    { id: 'religious', label: labels.religious, value: describeItems(preferences.religious, copy.religious, language) || null },
    { id: 'intolerances', label: labels.intolerances, value: describeItems(preferences.intolerances, copy.intolerances, language) || common.noneChosen },
    { id: 'allergies', label: labels.allergies, value: describeItems(preferences.allergies, copy.allergies, language) || common.noneChosen },
    { id: 'loves', label: labels.loves, value: text(preferences.foodsLoved) },
    { id: 'dislikes', label: labels.dislikes, value: text(preferences.foodsDisliked) },
    { id: 'mealsPerDay', label: labels.mealsPerDay, value: preferences.mealsPerDay ? String(preferences.mealsPerDay) : null },
  ];
}

/** "How I eat" in one line: 'Vegetarian · Kosher · 4 meals' ('' = nothing chosen). */
export function summarizeHowIEat(preferences: NutritionPreferences, language: Language): string {
  const copy = sharedCopy[language].nutrition;
  return [
    ...(preferences.dietType !== 'none' ? [copy.dietTypes[preferences.dietType]] : []),
    ...preferences.dietStyles.map((item) => (item.id === 'other' ? item.details || copy.dietStyles.other : copy.dietStyles[item.id])),
    ...preferences.religious.map((item) => copy.religious[item.id]),
    ...(preferences.mealsPerDay ? [formatPlural(language, copy.meals, preferences.mealsPerDay)] : []),
  ].join(' · ');
}

/** "Intolerances & allergies" in one line: 'Lactose-free · Peanuts' ('' = none chosen). */
export function summarizeRestrictions(preferences: NutritionPreferences, language: Language): string {
  const copy = sharedCopy[language].nutrition;
  return [
    ...preferences.intolerances.map((item) => (item.id === 'other' ? item.details || copy.intolerances.other : copy.intolerances[item.id])),
    ...preferences.allergies.map((item) => (item.id === 'other' ? item.details || copy.allergies.other : copy.allergies[item.id])),
  ].join(' · ');
}

/** '62 kg · 12 weeks' / '62 kg · by 3 Dec 2026' / '62 kg' — in the reader's unit. */
export function describeWeightGoal(goal: Pick<WeightGoal, 'targetWeightKg' | 'timeframe'>, unit: WeightUnit, language: Language): string {
  const copy = sharedCopy[language].nutrition;
  const target = formatWeight(goal.targetWeightKg, unit, language);
  if (!goal.timeframe) return target;
  return goal.timeframe.kind === 'weeks'
    ? `${target} · ${formatPlural(language, copy.goalWeeks, goal.timeframe.weeks)}`
    : `${target} · ${fill(copy.goalByDate, { date: formatDateOnly(goal.timeframe.date, language) })}`;
}

/** One row per preference, for the coach (builder panel, onboarding answers). */
export function describeNutritionPreferences(
  preferences: NutritionPreferences | null | undefined,
  language: Language,
): { label: string; value: string }[] {
  const common = sharedCopy[language].common;
  const copy = sharedCopy[language].nutrition;
  const labels = copy.preferences;
  if (!preferences) return [{ label: labels.title, value: common.notAnswered }];
  const diet = copy.dietTypes[preferences.dietType] ?? preferences.dietType;
  return [
    {
      label: labels.diet,
      value: preferences.dietTypeDetails ? fill(copy.itemWithDetails, { label: diet, details: isolateAuto(preferences.dietTypeDetails) }) : diet,
    },
    { label: labels.dietStyle, value: describeItems(preferences.dietStyles, copy.dietStyles, language) || '—' },
    { label: labels.religious, value: describeItems(preferences.religious, copy.religious, language) || '—' },
    { label: labels.intolerances, value: describeItems(preferences.intolerances, copy.intolerances, language) || common.noneChosen },
    { label: labels.allergies, value: describeItems(preferences.allergies, copy.allergies, language) || common.noneChosen },
    { label: labels.loves, value: preferences.foodsLoved?.trim() || '—' },
    { label: labels.dislikes, value: preferences.foodsDisliked?.trim() || '—' },
    { label: labels.mealsPerDay, value: preferences.mealsPerDay ? String(preferences.mealsPerDay) : common.noPreference },
  ];
}

/** Portion tracking, neutral wording (no judgment): '2 of 4½'. */
export function describeMarked(eaten: number, planned: number, language: Language): string {
  return fill(sharedCopy[language].nutrition.marked, { eaten: formatPortionCount(eaten), planned: formatPortionCount(planned) });
}

export type TrackingDayStatus = 'future' | 'no_plan' | 'not_marked' | 'marked';

/**
 * One tracked day for the coach (both apps): what to show and, per planned group,
 * "marked of planned". Neutral — no scores, no colors that judge.
 */
export function describeTrackingDay(
  day: Pick<MealLogDay, 'date' | 'planned' | 'eaten' | 'logged' | 'planVersion'>,
  today: string,
  language: Language,
): { status: TrackingDayStatus; groups: { group: PortionGroup; label: string; text: string }[] } {
  const groups = PORTION_GROUPS.filter((group) => day.planned[group] > 0).map((group) => ({
    group,
    label: foodGroupLabel(group, language),
    text: describeMarked(day.eaten[group], day.planned[group], language),
  }));
  if (day.date > today) return { status: 'future', groups: [] };
  if (day.planVersion === null || groups.length === 0) return { status: 'no_plan', groups: [] };
  return { status: day.logged ? 'marked' : 'not_marked', groups };
}

/** "Kcal" wording for the coach only — never used on trainee screens. */
export function formatKcal(kcal: number, language: Language): string {
  return `${formatNumber(kcal, language)} ${sharedCopy[language].units.kcal}`;
}
