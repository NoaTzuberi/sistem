import { useMemo } from 'react';
import type { NutritionIssue } from '@sistem/types';
import type { NutritionDraft } from '../nutritionDraft';
import { BUDGET_GROUPS } from './usePortionBudget';
import type { PortionBudget } from './usePortionBudget';

export type BuilderSection = 'target' | 'meals' | 'message';

export interface ChecklistItem {
  id: 'target' | 'daily' | 'meals' | 'issues' | 'portions' | 'message';
  section: BuilderSection;
  /** ok · todo (blocks publishing) · advice (worth fixing, does not block) · optional. */
  state: 'ok' | 'todo' | 'advice' | 'optional';
}

// The server's publish errors the checklist already shows as its own items.
const OWN_CODES = new Set(['target_missing', 'floor_unconfirmed', 'no_meals', 'no_portions']);

/** The design's "at least 3 meals" (advice: the server only needs one). */
const SUGGESTED_MEALS = 3;

/**
 * "Before publish", by mode, from the server's own rules (nutrition.validation) checked live on the draft:
 * - portions: a target (the floor confirmed when below it), daily portions for each group, the message (optional);
 * - menu: a target, every portion given out to the meals (advice), at least 3 meals (one is required, three advised),
 *   no other publish error (as of the last save — only listed when there is one), the message (optional).
 */
export function usePublishChecklist(draft: NutritionDraft, issues: readonly NutritionIssue[], budget: PortionBudget, floorKcal: number) {
  return useMemo(() => {
    const { kcal, confirmBelowFloor } = draft.target;
    const targetOk = kcal !== undefined && (kcal >= floorKcal || confirmBelowFloor);
    const target: ChecklistItem = { id: 'target', section: 'target', state: targetOk ? 'ok' : 'todo' };
    const message: ChecklistItem = { id: 'message', section: 'message', state: draft.introMessage.trim() ? 'ok' : 'optional' };

    let items: ChecklistItem[];
    if (draft.mode === 'portions') {
      const day = draft.dailyPortions;
      const none = BUDGET_GROUPS.every((group) => day[group] === 0) && day.snack === 0;
      const everyGroup = BUDGET_GROUPS.every((group) => day[group] > 0);
      items = [target, { id: 'daily', section: 'meals', state: none ? 'todo' : everyGroup ? 'ok' : 'advice' }, message];
    } else {
      const otherErrors = issues.filter((issue) => issue.severity === 'error' && !OWN_CODES.has(issue.code));
      const mealCount = draft.meals.length;
      items = [
        target,
        { id: 'portions', section: 'meals', state: budget.state === 'exact' ? 'ok' : 'advice' },
        { id: 'meals', section: 'meals', state: mealCount === 0 ? 'todo' : mealCount >= SUGGESTED_MEALS ? 'ok' : 'advice' },
        ...(otherErrors.length > 0 ? [{ id: 'issues' as const, section: 'meals' as const, state: 'todo' as const }] : []),
        message,
      ];
    }
    const blockers = items.filter((item) => item.state === 'todo');
    return { items, blockers: blockers.length, firstBlocker: blockers[0] ?? null };
  }, [draft.target, draft.mode, draft.dailyPortions, draft.meals.length, draft.introMessage, issues, budget.state, floorKcal]);
}
