import { useMemo } from 'react';
import { useCopy, useLoad } from '@sistem/shared';
import { getWeek, listPlans } from '../../../services/plans/plansService';
import { buildWeekPlan } from '../data/weekPlanDisplay';
import { workoutCopy } from '../copy';

async function loadWeekPlan() {
  const [week, plans] = await Promise.all([getWeek(), listPlans()]);
  return {
    week,
    // Only next week; plans the coach published further ahead stay hidden until then.
    nextWeek: {
      weekStartDate: plans.nextWeekStartDate,
      plan: plans.items.find((plan) => plan.weekStartDate === plans.nextWeekStartDate) ?? null,
    },
  };
}

/** This week's published plan (/plans/week: statuses, next workout, open session) and next week's (/plans). */
export function useWeekPlan() {
  const copy = useCopy(workoutCopy);
  const { data, error, isLoading, reload } = useLoad(loadWeekPlan, copy.list.loadError);
  const weekPlan = useMemo(() => (data ? buildWeekPlan(data.week, data.nextWeek) : null), [data]);
  return { weekPlan, activeLog: data?.week.activeLog ?? null, error, isLoading, reload };
}
