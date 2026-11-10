import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlanRequestError } from '@sistem/api-client';
import { getActiveLanguage, useNewPlanFlow } from '@sistem/shared';
import type { OpenNewPlanFlow, PlanStartMethod } from '@sistem/shared';
import { planPath } from '../../../app/config/routes';
import { createPlan, deletePlan, listPlanSources, listPlanWeeks } from '../../../services/coach/coachService';
import type { SplitOnlyRequest } from '../../planBuilder/types';
import { describePlanCreateError, isStaleListError } from '../data/planCreateErrors';

export type { PlanLength, PlanStartMethod } from '@sistem/shared';

/** What the builder is told to load into the new plan (its router state). */
export type PlanStart = { loadAiDraftId: string } | { splitOnly: SplitOnlyRequest };

interface OpenOptions extends OpenNewPlanFlow {
  /** From the AI sheet: exactly this start ("use the full plan" / "split only") instead of the latest draft. */
  aiStart?: PlanStart;
}

/** The replace question on create: one week's draft, or several weeks of a multi-week plan. */
interface ReplaceQuestion {
  weeks: string[];
  /** Several weeks' drafts (a multi-week plan). */
  isMany: boolean;
}

const FLOW_API = { listPlanWeeks, listPlanSources, deletePlan };

/**
 * The dashboard's "תוכנית חדשה" popover: the shared two-step flow (useNewPlanFlow — which week, how to start)
 * plus creating the plan and opening it in the builder. Replacing draft(s) always asks first. A failure stays on
 * screen with "נסי שוב" — nothing retries or reopens by itself.
 */
export function useNewPlanPopover(traineeId: string, latestAiDraftId: string | undefined, onCreated: () => void) {
  const navigate = useNavigate();
  const flow = useNewPlanFlow(traineeId, FLOW_API, onCreated);
  const [aiStart, setAiStart] = useState<PlanStart>();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [question, setQuestion] = useState<ReplaceQuestion | null>(null);
  // What "try again" repeats: the failed create (true = with replaceDraft), or (null) loading the lists.
  const lastAttempt = useRef<boolean | null>(null);

  const canUseAi = aiStart !== undefined || latestAiDraftId !== undefined;
  // The AI start falls back to an empty plan when there is no draft.
  const method: PlanStartMethod = flow.method === 'ai' && !canUseAi ? 'scratch' : flow.method;
  const hasSources = (flow.sources?.length ?? 0) > 0;
  const needsSource = method === 'duplicate' && !flow.source;
  const { open: openFlow, close: closeFlow } = flow;

  const open = useCallback(
    async (wanted: OpenOptions = {}) => {
      setAiStart(wanted.aiStart);
      setError(undefined);
      setQuestion(null);
      lastAttempt.current = null;
      await openFlow(wanted);
    },
    [openFlow],
  );

  const close = useCallback(() => {
    setQuestion(null);
    closeFlow();
  }, [closeFlow]);

  async function create(replaceDraft: boolean) {
    const week = flow.week;
    if (!week || needsSource) return;
    lastAttempt.current = replaceDraft;
    setIsCreating(true);
    setError(undefined);
    try {
      const plan = await createPlan(traineeId, {
        weekStartDate: week.weekStartDate,
        ...(method === 'duplicate' && flow.source ? { sourcePlanId: flow.source.id } : {}),
        ...(replaceDraft ? { replaceDraft: true } : {}),
        // A multi-week plan starts with its light last week on (the builder's switch turns it off).
        ...(flow.length === 'block' ? { lengthWeeks: flow.blockWeeks, deloadLastWeek: true } : {}),
      });
      setQuestion(null);
      onCreated();
      const start = method === 'ai' ? (aiStart ?? (latestAiDraftId ? { loadAiDraftId: latestAiDraftId } : undefined)) : undefined;
      navigate(planPath(traineeId, plan.id), start ? { state: start } : undefined);
    } catch (failure) {
      setIsCreating(false);
      // The lists were out of date (another tab, the other app): she is asked now.
      if (failure instanceof PlanRequestError && failure.code === 'plan_week_has_draft') {
        setQuestion({ weeks: [week.weekStartDate], isMany: false });
        flow.refreshLists();
        return;
      }
      if (failure instanceof PlanRequestError && failure.code === 'plan_block_has_drafts' && failure.weeks.length > 0) {
        setQuestion({ weeks: failure.weeks, isMany: true });
        flow.refreshLists();
        return;
      }
      setQuestion(null);
      setError(describePlanCreateError(failure, getActiveLanguage()));
      // The lists on screen are out of date: fetch them once, quietly (the error stays).
      if (isStaleListError(failure)) {
        onCreated();
        flow.refreshLists();
      }
    }
  }

  /** Step 2's pink pill: create — over draft(s), the question first. */
  function confirm() {
    const { situation, week } = flow;
    if (!week) return;
    if (situation.kind === 'draft' && situation.canReplace) setQuestion({ weeks: [week.weekStartDate], isMany: false });
    else if (situation.kind === 'blockDrafts') setQuestion({ weeks: situation.weeks, isMany: true });
    else if (situation.kind === 'create') void create(false);
  }

  /** "Try again": the same create, or loading the lists again. Only ever on a press. */
  function retry() {
    if (lastAttempt.current !== null) void create(lastAttempt.current);
    else flow.reloadLists();
  }

  /** Opens the plan already in the chosen week (step 1's draft / published card). */
  function openExisting() {
    const { situation } = flow;
    if (situation.kind === 'draft' || situation.kind === 'published') navigate(planPath(traineeId, situation.plan.id));
  }

  return {
    ...flow,
    open,
    close,
    method,
    canUseAi,
    hasSources,
    needsSource,
    isCreating,
    error: error ?? flow.loadError,
    retry,
    confirm,
    openExisting,
    question,
    replace: () => void create(true),
    cancelQuestion: () => setQuestion(null),
  };
}

export type NewPlanPopoverState = ReturnType<typeof useNewPlanPopover>;
