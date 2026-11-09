import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlanRequestError } from '@sistem/api-client';
import type { PlanDuplicateSource, PlanWeekOption, PlanWeekOptions } from '@sistem/types';
import { getActiveLanguage } from '@sistem/shared';
import { planPath } from '../../../app/config/routes';
import { createPlan, listPlanSources, listPlanWeeks } from '../../../services/coach/coachService';
import type { SplitOnlyRequest } from '../../planBuilder/types';
import { NEW_PLAN_WEEK_COUNT } from '../data/planWeeks';
import { describePlanCreateError, isStaleListError } from '../data/planCreateErrors';
import { DEFAULT_BLOCK_WEEKS, defaultSourceFor, firstTakenBlockWeek, startActionFor } from '../data/newPlanStart';
import type { PlanLength, PlanStartMethod } from '../data/newPlanStart';
import { traineesCopy } from '../copy';

export type { PlanLength, PlanStartMethod };

/** What the builder is told to load into the new plan (its router state). */
export type PlanStart = { loadAiDraftId: string } | { splitOnly: SplitOnlyRequest };

interface OpenOptions {
  /** The start method the trigger stands for (the toolbar's three pills). */
  method?: PlanStartMethod;
  /** From the AI sheet: exactly this start ("use the full plan" / "split only") instead of the latest draft. */
  aiStart?: PlanStart;
  /** The week to preselect (the Plans tab's empty week), when the popover offers it. */
  week?: string;
}

interface Attempt {
  method: PlanStartMethod;
  replaceDraft: boolean;
}

/**
 * The "new plan" popover: for which week, and how to start. The weeks and the plans she can
 * duplicate from (published only) come fresh from the server each time it opens.
 *
 * Never loops (bug 2026-11-09): a failure stays on screen with what to do and a "try again"
 * button — nothing retries or reopens by itself — and a week that already has a draft asks
 * (replace / open / cancel) instead of failing silently.
 */
export function useNewPlanPopover(traineeId: string, latestAiDraftId: string | undefined, onCreated: () => void) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PlanWeekOptions | null>(null);
  const [sources, setSources] = useState<PlanDuplicateSource[] | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>();
  const [pickedSourceId, setPickedSourceId] = useState<string>();
  const [method, setMethod] = useState<PlanStartMethod>('scratch');
  // The FIRST choice (owner, 2026-11-09): weekly, or a multi-week plan of 2–8 weeks.
  const [length, setLength] = useState<PlanLength>('weekly');
  const [blockWeeks, setBlockWeeks] = useState(DEFAULT_BLOCK_WEEKS);
  const [aiStart, setAiStart] = useState<PlanStart>();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>();
  /** The week already has this draft: the replace / open / cancel question is showing. */
  const [draftConflict, setDraftConflict] = useState<{ planId: string } | null>(null);
  // Only the newest "open" may fill the popover.
  const latestOpen = useRef(0);
  const lastOpen = useRef<OpenOptions>({});
  // What "try again" repeats: the failed create, or (null) loading the lists.
  const lastAttempt = useRef<Attempt | null>(null);

  const weeks: PlanWeekOption[] = options?.weeks.slice(0, NEW_PLAN_WEEK_COUNT) ?? [];
  const week = weeks.find((entry) => entry.weekStartDate === selectedWeek);
  const canUseAi = aiStart !== undefined || latestAiDraftId !== undefined;
  // A method the trainee cannot use falls back to an empty plan. "Duplicate" stays: no sources = its empty state.
  const effectiveMethod: PlanStartMethod = method === 'ai' && !canUseAi ? 'scratch' : method;
  // Preselected: her own latest plan before the chosen week, else the newest of any trainee.
  const source = sources?.find((entry) => entry.id === pickedSourceId) ?? defaultSourceFor(sources ?? [], traineeId, week?.weekStartDate);
  // A multi-week plan needs every one of its weeks free: the first taken one the picker can see.
  const blockTakenWeek = length === 'block' && week ? firstTakenBlockWeek(options?.weeks ?? [], week.weekStartDate, blockWeeks) : null;

  /** Weeks + sources. `keepState` = a refresh after a failure: the error and the choices stay. */
  const loadLists = useCallback(
    async (wantedWeek: string | undefined, keepState: boolean) => {
      const request = ++latestOpen.current;
      if (!keepState) {
        setOptions(null);
        setSources(null);
      }
      try {
        const [loaded, loadedSources] = await Promise.all([listPlanWeeks(traineeId), listPlanSources(traineeId)]);
        if (request !== latestOpen.current) return;
        const offered = loaded.weeks.slice(0, NEW_PLAN_WEEK_COUNT);
        setOptions(loaded);
        setSources(loadedSources);
        if (keepState) return;
        // The first free week; when all four are taken, the first (it opens its plan).
        const asked = wantedWeek ? offered.find((entry) => entry.weekStartDate === wantedWeek) : undefined;
        setSelectedWeek((asked ?? offered.find((entry) => entry.plan === null) ?? offered[0])?.weekStartDate);
      } catch {
        if (request !== latestOpen.current) return;
        lastAttempt.current = null;
        setError(traineesCopy[getActiveLanguage()].weeksLoadError);
      }
    },
    [traineeId],
  );

  const open = useCallback(
    async (wanted: OpenOptions = {}) => {
      lastOpen.current = wanted;
      setIsOpen(true);
      setMethod(wanted.method ?? 'scratch');
      setLength('weekly');
      setBlockWeeks(DEFAULT_BLOCK_WEEKS);
      setAiStart(wanted.aiStart);
      setPickedSourceId(undefined);
      setDraftConflict(null);
      setError(undefined);
      await loadLists(wanted.week, false);
    },
    [loadLists],
  );

  const close = useCallback(() => {
    latestOpen.current += 1;
    setDraftConflict(null);
    setIsOpen(false);
  }, []);

  async function create({ method: chosen, replaceDraft }: Attempt) {
    if (!week) return;
    if (chosen === 'duplicate' && !source) return;
    lastAttempt.current = { method: chosen, replaceDraft };
    setIsCreating(true);
    setError(undefined);
    try {
      const plan = await createPlan(traineeId, {
        weekStartDate: week.weekStartDate,
        ...(chosen === 'duplicate' && source ? { sourcePlanId: source.id } : {}),
        ...(replaceDraft ? { replaceDraft: true } : {}),
        // A multi-week plan starts with its light last week on (the builder's switch turns it off).
        ...(length === 'block' ? { lengthWeeks: blockWeeks, deloadLastWeek: true } : {}),
      });
      setDraftConflict(null);
      onCreated();
      const start = chosen === 'ai' ? (aiStart ?? (latestAiDraftId ? { loadAiDraftId: latestAiDraftId } : undefined)) : undefined;
      navigate(planPath(traineeId, plan.id), start ? { state: start } : undefined);
    } catch (failure) {
      setIsCreating(false);
      if (failure instanceof PlanRequestError && failure.code === 'plan_week_has_draft' && failure.planId) {
        setDraftConflict({ planId: failure.planId });
        return;
      }
      setDraftConflict(null);
      setError(describePlanCreateError(failure, getActiveLanguage()));
      // The lists on screen are out of date: fetch them once, quietly (the error stays).
      if (isStaleListError(failure)) {
        onCreated();
        void loadLists(undefined, true);
      }
    }
  }

  /**
   * The primary button. A week with a plan opens it — except a draft week when duplicating:
   * the server answers plan_week_has_draft and she chooses. `override` = the empty state's
   * "build a new plan".
   */
  async function confirm(override?: PlanStartMethod) {
    const chosen = override ?? effectiveMethod;
    if (!week) return;
    if (override) setMethod(override);
    if (startActionFor(week, chosen, length) === 'open' && week.plan) {
      navigate(planPath(traineeId, week.plan.id));
      return;
    }
    await create({ method: chosen, replaceDraft: false });
  }

  /** "Try again": the same create, or loading the lists again. Only ever on a press. */
  function retry() {
    if (lastAttempt.current) void create(lastAttempt.current);
    else void open(lastOpen.current);
  }

  return {
    isOpen,
    /** The weeks are still on their way. */
    isLoading: isOpen && (options === null || sources === null) && error === undefined,
    currentWeekStart: options?.currentWeekStart,
    weeks,
    week,
    method: effectiveMethod,
    length,
    selectLength: setLength,
    blockWeeks,
    selectBlockWeeks: setBlockWeeks,
    /** The first week of the chosen block that is already taken (null = all free, as far as the picker sees). */
    blockTakenWeek,
    canUseAi,
    /** Published plans she can copy (null = loading). */
    sources,
    source,
    selectSource: setPickedSourceId,
    isCreating,
    error,
    retry,
    draftConflict,
    replaceDraft: () => void create({ method: 'duplicate', replaceDraft: true }),
    openDraft: () => draftConflict && navigate(planPath(traineeId, draftConflict.planId)),
    cancelDraftConflict: () => setDraftConflict(null),
    open,
    close,
    selectWeek: setSelectedWeek,
    selectMethod: setMethod,
    confirm,
  };
}

export type NewPlanPopoverState = ReturnType<typeof useNewPlanPopover>;
