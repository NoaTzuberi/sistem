import { useCallback, useMemo } from 'react';
import { useCopy, useLoad } from '@sistem/shared';
import { getWeek, listPlans } from '../../../services/plans/plansService';
import { buildWeekPlan } from '../data/weekPlanDisplay';
import { workoutCopy } from '../copy';

async function loadWeekPlan(coachingId?: string) {
  const [week, plans] = await Promise.all([getWeek(coachingId), listPlans(coachingId)]);
  return {
    week,
    // Only next week; plans the coach published further ahead stay hidden until then.
    nextWeek: {
      weekStartDate: plans.nextWeekStartDate,
      plan: plans.items.find((plan) => plan.weekStartDate === plans.nextWeekStartDate) ?? null,
    },
  };
}

/**
 * This week's published plan (/plans/week: statuses, next workout, open session) and next week's (/plans).
 * Coaching-aware: a coachingId shows one coach's plan (the later multi-coach UI); without it, her current coaching.
 */
export function useWeekPlan(coachingId?: string) {
  const copy = useCopy(workoutCopy);
  const load = useCallback(() => loadWeekPlan(coachingId), [coachingId]);
  const { data, error, isLoading, reload } = useLoad(load, copy.list.loadError);
  const weekPlan = useMemo(() => (data ? buildWeekPlan(data.week, data.nextWeek) : null), [data]);
  return { weekPlan, activeLog: data?.week.activeLog ?? null, error, isLoading, reload };
}
