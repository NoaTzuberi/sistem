// Portion tracking (PRD §5.6, Phase 13a+).

/** She can view and correct today and the days before it, this many days in all. */
export const MEAL_LOG_EDITABLE_DAYS = 7;
/** Photos per day (all meals together) — a guard, not a goal. */
export const MAX_MEAL_PHOTOS_PER_DAY = 15;
/** Default meals (portions-only plans and her own target): ids are stable, names come from the catalog. */
export const DEFAULT_MEAL_IDS_BY_COUNT: Record<number, string[]> = {
  2: ['breakfast', 'dinner'],
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'snack', 'dinner'],
  5: ['breakfast', 'lunch', 'snack', 'dinner', 'afternoon_snack'],
  6: ['breakfast', 'lunch', 'snack', 'dinner', 'afternoon_snack', 'evening_snack'],
};
export const DEFAULT_MEAL_COUNT = 4;
