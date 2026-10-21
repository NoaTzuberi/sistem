import type { MealLogDay, NutritionPlanMode, NutritionPlanView, PortionCounts, PortionGroup } from '@sistem/types';
import { PORTION_GROUPS } from '@sistem/shared';

// The trainee Nutrition screen's plain logic (docs/design/trainee-nutrition.html): the plan's mode, the
// week strip, and portion math. Marks never go over the planned count (the server clamps them too).

/** 'menu' = meals with options; 'portions' = daily portions per group, she picks the foods herself. */
export type PlanMode = NutritionPlanMode;

/** The coach's choice, from the server. A plan cached before modes existed: any option line makes it a menu. */
export function planMode(plan: NutritionPlanView): PlanMode {
  if (plan.mode) return plan.mode;
  return plan.meals.some((meal) => meal.options.some((option) => option.lines.length > 0)) ? 'menu' : 'portions';
}

export function hasFreeVegetables(plan: NutritionPlanView): boolean {
  return plan.vegetablesFree ?? plan.meals.some((meal) => meal.vegetablesFree);
}

export function sumPortions(counts: PortionCounts): number {
  return PORTION_GROUPS.reduce((total, group) => total + counts[group], 0);
}

/** The groups this change completed (reached the goal from below). */
export function completedGroups(before: PortionCounts, after: PortionCounts, planned: PortionCounts): PortionGroup[] {
  return PORTION_GROUPS.filter((group) => planned[group] > 0 && after[group] >= planned[group] && before[group] < planned[group]);
}

/** Up to `wanted` more portions per group, never past planned: what was really added. */
export function portionsToAdd(wanted: PortionCounts, eaten: PortionCounts, planned: PortionCounts): PortionCounts {
  const added = { ...wanted };
  for (const group of PORTION_GROUPS) added[group] = Math.max(0, Math.min(wanted[group], planned[group] - eaten[group]));
  return added;
}

export function addPortions(eaten: PortionCounts, added: PortionCounts): PortionCounts {
  const next = { ...eaten };
  for (const group of PORTION_GROUPS) next[group] = eaten[group] + added[group];
  return next;
}

export function removePortions(eaten: PortionCounts, removed: PortionCounts): PortionCounts {
  const next = { ...eaten };
  for (const group of PORTION_GROUPS) next[group] = Math.max(0, eaten[group] - removed[group]);
  return next;
}

export function onePortion(group: PortionGroup): PortionCounts {
  return { protein: 0, carb: 0, fat: 0, snack: 0, [group]: 1 };
}

export type WeekDayState = 'past' | 'today' | 'future';

export interface WeekDay {
  date: string;
  dayOfMonth: number;
  /** 0 = Sunday. */
  weekday: number;
  state: WeekDayState;
  /** Eaten / planned that day, 0–1; 0 without a plan or a log. */
  progress: number;
  /** Tappable: today or a past day the server sent (her 7-day window). */
  available: boolean;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function dateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return parseDate(date).getUTCDay();
}

/** Her current Sunday week (weeks start on Sunday), with each day's progress from the logged days. */
export function weekOf(today: string, days: readonly MealLogDay[]): WeekDay[] {
  const sunday = parseDate(today);
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(sunday);
    value.setUTCDate(sunday.getUTCDate() + index);
    const date = dateString(value);
    const day = days.find((candidate) => candidate.date === date);
    const planned = day ? sumPortions(day.planned) : 0;
    const state: WeekDayState = date === today ? 'today' : date < today ? 'past' : 'future';
    return {
      date,
      dayOfMonth: value.getUTCDate(),
      weekday: index,
      state,
      progress: day && planned > 0 ? Math.min(1, sumPortions(day.eaten) / planned) : 0,
      available: state !== 'future' && day !== undefined,
    };
  });
}

/** "MON 19.10" — the header eyebrow's Latin date (decoration; the Hebrew line carries it). */
export function eyebrowDate(date: string, weekdays: readonly string[]): string {
  const value = parseDate(date);
  const dd = String(value.getUTCDate()).padStart(2, '0');
  const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
  return `${weekdays[value.getUTCDay()]} ${dd}.${mm}`;
}
