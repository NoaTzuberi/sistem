import type { MealLogDay, PortionCounts, TraineeNutritionPlanResponse } from '@sistem/types';

// The Nutrition tab kept on the phone (Phase 13a+): the last plan and days the server
// sent, so the tab opens without a connection, and the marks the server hasn't confirmed
// yet (sent again on reconnect / foreground — last write wins). Storage can be unavailable
// (private mode, quota): every call is best effort.

export interface NutritionCache {
  plan: TraineeNutritionPlanResponse | null;
  today: string | null;
  days: MealLogDay[];
  /** Whole-day marks waiting for the server, by date. */
  pending: Record<string, PortionCounts>;
  /**
   * Menu meals she marked "I ate this", by date → meal id → the portions that mark added (so unmarking
   * takes back exactly those). Phone only: the server keeps counts per group, never which meal (PRD 13a+).
   */
  mealMarks: Record<string, Record<string, PortionCounts>>;
}

const KEY_PREFIX = 'sistem.nutrition.';
const EMPTY: NutritionCache = { plan: null, today: null, days: [], pending: {}, mealMarks: {} };

export function loadNutritionCache(userId: string): NutritionCache {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<NutritionCache>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function saveNutritionCache(userId: string, patch: Partial<NutritionCache>): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify({ ...loadNutritionCache(userId), ...patch }));
  } catch {
    // Full or blocked storage: the server copy still has everything sent so far.
  }
}
