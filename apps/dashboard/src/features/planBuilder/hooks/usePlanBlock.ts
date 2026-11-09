import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CoachPlan, PlanBlockWeek, PlanWorkout } from '@sistem/types';
import { fill, formatPlural, getActiveLanguage } from '@sistem/shared';
import { planPath } from '../../../app/config/routes';
import { copyPlanForward, getPlan, updatePlanBlock } from '../../../services/coach/coachService';
import { laterWeeksRange } from '../data/blockWeeks';
import type { RibbonFill } from '../components/BlockRibbon/BlockRibbon';
import { planBuilderCopy } from '../copy';

// Read when the text is needed (callbacks run later): the language on screen at that moment.
const text = () => planBuilderCopy[getActiveLanguage()].block;

const STAGGER_MS = 60;
const FILL_MS = 260;

interface UsePlanBlockOptions {
  traineeId: string;
  plan: CoachPlan;
  /** Saves the editor's pending changes first; false = the server refused them. */
  save: () => Promise<boolean>;
  applyPlan: (plan: CoachPlan) => void;
  notify: (message: string) => void;
}

/**
 * A multi-week plan in the builder: moving between its weeks, its length and light week, and "copy
 * to the next weeks" (save → copy on the server → the ribbon fills → the toast). Also loads the week
 * before this one, so each exercise can show what changed ("+2.5 ק״ג ↑").
 */
export function usePlanBlock({ traineeId, plan, save, applyPlan, notify }: UsePlanBlockOptions) {
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [ribbonFill, setRibbonFill] = useState<RibbonFill | null>(null);
  const [previousWeek, setPreviousWeek] = useState<PlanWorkout[]>();
  const block = plan.block;
  const previousPlanId = block && block.week > 1 ? plan.blockWeeks?.find((entry) => entry.week === block.week - 1)?.planId : undefined;

  useEffect(() => {
    setPreviousWeek(undefined);
    if (!previousPlanId) return;
    let isCurrent = true;
    getPlan(traineeId, previousPlanId)
      .then((previous) => isCurrent && setPreviousWeek([...previous.workouts].sort((a, b) => a.order - b.order)))
      // Without it the chips just stay away.
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [traineeId, previousPlanId]);

  const goToWeek = useCallback((week: PlanBlockWeek) => navigate(planPath(traineeId, week.planId)), [navigate, traineeId]);

  async function run(action: () => Promise<void>, fallback: string) {
    setIsBusy(true);
    try {
      await action();
    } catch (failure) {
      notify((failure instanceof Error && failure.message) || fallback);
    } finally {
      setIsBusy(false);
    }
  }

  function copyForward() {
    if (!block || isBusy) return;
    const later = laterWeeksRange(block.week, block.lengthWeeks);
    if (!later) return;
    const range = `${later.from}–${later.to}`;
    const filled = (plan.blockWeeks ?? []).some((entry) => entry.week > block.week && entry.workoutCount > 0);
    if (filled && !window.confirm(fill(text().copyConfirm, { range, n: block.week }))) return;
    void run(async () => {
      if (!(await save())) return;
      const result = await copyPlanForward(traineeId, plan.id);
      applyPlan(result.plan);
      setRibbonFill({ fromWeek: block.week, key: Date.now() });
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delay = reduce ? 0 : (result.copiedWeeks.length - 1) * STAGGER_MS + FILL_MS;
      const message = later.from === later.to ? fill(text().copiedOne, { n: later.from }) : fill(text().copied, { range });
      window.setTimeout(() => notify(message), delay);
    }, text().copyError);
  }

  function changeLength(weeks: number) {
    if (!block || isBusy || weeks === block.lengthWeeks) return;
    if (weeks < block.lengthWeeks && !window.confirm(fill(text().shrinkConfirm, { weeks: formatPlural(getActiveLanguage(), text().weeks, weeks) }))) return;
    void run(async () => {
      if (!(await save())) return;
      const next = await updatePlanBlock(traineeId, plan.id, { lengthWeeks: weeks });
      // This week was removed: the server answers week 1.
      if (next.id !== plan.id) navigate(planPath(traineeId, next.id), { replace: true });
      else applyPlan(next);
    }, text().lengthError);
  }

  function changeDeload(deloadLastWeek: boolean) {
    if (!block || isBusy) return;
    void run(async () => {
      applyPlan(await updatePlanBlock(traineeId, plan.id, { deloadLastWeek }));
    }, text().lengthError);
  }

  return { block, weeks: plan.blockWeeks ?? [], isBusy, ribbonFill, previousWeek, goToWeek, copyForward, changeLength, changeDeload };
}
