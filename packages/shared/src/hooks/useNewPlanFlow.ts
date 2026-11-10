import { useCallback, useRef, useState } from 'react';
import type { PlanDuplicateSource, PlanWeekOptions } from '@sistem/types';
import { sharedCopy } from '../copy';
import { getActiveLanguage } from '../i18n/language';
import { DEFAULT_BLOCK_WEEKS, defaultSourceFor, defaultWeekOf, newPlanSituation, rangeWeeks, replacesDrafts, visibleWeekRows, weekConflictOf } from '../newPlanFlow';
import type { PlanLength, PlanStartMethod } from '../newPlanFlow';

/** The calls the flow needs (each app passes its own coach API). */
export interface NewPlanFlowApi {
  listPlanWeeks: (traineeId: string) => Promise<PlanWeekOptions>;
  listPlanSources: (traineeId: string) => Promise<PlanDuplicateSource[]>;
  deletePlan: (traineeId: string, planId: string, options: { draftOnly?: boolean }) => Promise<void>;
}

export interface OpenNewPlanFlow {
  /** The start method the trigger stands for (preselected on step 2). */
  method?: PlanStartMethod;
  /** The week to preselect. With a method and a free week, the flow opens on step 2. */
  week?: string;
}

export type NewPlanStep = 1 | 2;

/**
 * The two-step "תוכנית חדשה" of both coach apps: the weeks and the published plans she can copy (fresh
 * from the server each time it opens), the chosen week / length / start, the step, and "מחיקת הטיוטה".
 * Creating stays in each app (the dashboard opens the builder; coach mode duplicates and publishes).
 * Nothing retries or reopens by itself (bug 2026-11-09).
 */
export function useNewPlanFlow(traineeId: string, api: NewPlanFlowApi, onChanged: () => void) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<NewPlanStep>(1);
  /** Which way the last step change went: the slide comes from the reading end (forward) or start (back). */
  const [motion, setMotion] = useState<'forward' | 'back' | 'none'>('none');
  const [options, setOptions] = useState<PlanWeekOptions | null>(null);
  const [sources, setSources] = useState<PlanDuplicateSource[] | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>();
  const [length, setLength] = useState<PlanLength>('weekly');
  const [blockWeeks, setBlockWeeks] = useState(DEFAULT_BLOCK_WEEKS);
  const [method, setMethod] = useState<PlanStartMethod>('scratch');
  const [pickedSourceId, setPickedSourceId] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<{ planId: string; weekStartDate: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Only the newest "open" may fill the flow.
  const latestOpen = useRef(0);
  const lastOpen = useRef<OpenNewPlanFlow>({});

  const allWeeks = options?.weeks ?? [];
  const week = allWeeks.find((entry) => entry.weekStartDate === selectedWeek);
  const range = week ? rangeWeeks(week.weekStartDate, length, blockWeeks) : [];
  const situation = newPlanSituation(allWeeks, week?.weekStartDate, length, blockWeeks);
  const source = sources?.find((entry) => entry.id === pickedSourceId) ?? defaultSourceFor(sources ?? [], traineeId, week?.weekStartDate);

  /** Weeks + sources. `keepState` = a refresh (after a delete or a stale create): the choices stay. */
  const loadLists = useCallback(
    async (wanted: OpenNewPlanFlow, keepState: boolean) => {
      const request = ++latestOpen.current;
      if (!keepState) {
        setOptions(null);
        setSources(null);
      }
      setLoadError(undefined);
      try {
        const [loaded, loadedSources] = await Promise.all([apiRef.current.listPlanWeeks(traineeId), apiRef.current.listPlanSources(traineeId)]);
        if (request !== latestOpen.current) return;
        setOptions(loaded);
        setSources(loadedSources);
        if (keepState) return;
        const first = defaultWeekOf(visibleWeekRows(loaded.weeks, []), wanted.week);
        setSelectedWeek(first);
        // "Start this week from scratch" (an empty week's own buttons): straight to how to start.
        const firstPlan = loaded.weeks.find((entry) => entry.weekStartDate === first)?.plan;
        if (wanted.week && wanted.method && first === wanted.week && weekConflictOf(firstPlan) === 'free') {
          setMotion('none');
          setStep(2);
        }
      } catch {
        if (request !== latestOpen.current) return;
        setLoadError(sharedCopy[getActiveLanguage()].newPlanFlow.weeksLoadError);
      }
    },
    [traineeId],
  );

  const open = useCallback(
    async (wanted: OpenNewPlanFlow = {}) => {
      lastOpen.current = wanted;
      setIsOpen(true);
      setStep(1);
      setMotion('none');
      setMethod(wanted.method ?? 'scratch');
      setLength('weekly');
      setBlockWeeks(DEFAULT_BLOCK_WEEKS);
      setPickedSourceId(undefined);
      setDeleteTarget(null);
      await loadLists(wanted, false);
    },
    [loadLists],
  );

  const close = useCallback(() => {
    latestOpen.current += 1;
    setDeleteTarget(null);
    setIsOpen(false);
  }, []);

  function goTo(next: NewPlanStep) {
    setMotion(next === 2 ? 'forward' : 'back');
    setStep(next);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const text = () => sharedCopy[getActiveLanguage()].newPlanFlow;
    try {
      await apiRef.current.deletePlan(traineeId, deleteTarget.planId, { draftOnly: true });
      setDeleteTarget(null);
      onChanged();
      await loadLists({}, true);
    } catch (failure) {
      const code = (failure as { code?: string } | null)?.code;
      setDeleteError(code === 'plan_not_draft' ? text().deleteNotDraft : text().deleteError);
      if (code) void loadLists({}, true);
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    isOpen,
    open,
    close,
    step,
    motion,
    /** The weeks are still on their way. */
    isLoading: isOpen && (options === null || sources === null) && loadError === undefined,
    loadError,
    /** "נסי שוב" after a failed load (only ever on a press). */
    reloadLists: () => void loadLists(lastOpen.current, false),
    /** A quiet refresh: the choices stay. */
    refreshLists: () => void loadLists({}, true),
    currentWeekStart: options?.currentWeekStart,
    /** Every week the server offered (the conflicts read them all). */
    allWeeks,
    /** The rows of step 1. */
    rows: visibleWeekRows(allWeeks, range),
    week,
    selectWeek: setSelectedWeek,
    /** The weeks the plan covers, in order (one for a weekly plan). */
    range,
    length,
    selectLength: setLength,
    blockWeeks,
    selectBlockWeeks: setBlockWeeks,
    situation,
    /** Step 2 creates over draft(s): it asks first and sends `replaceDraft`. */
    isReplacing: replacesDrafts(situation),
    /** "המשך" — every week free. */
    next: () => situation.kind === 'create' && goTo(2),
    /** "להתחיל מחדש" — the draft(s) are replaced on create. */
    startOver: () => replacesDrafts(situation) && goTo(2),
    back: () => goTo(1),
    method,
    selectMethod: setMethod,
    /** Published plans she can copy (null = loading). */
    sources,
    source,
    selectSource: setPickedSourceId,
    deleteTarget,
    askDelete: (planId: string, weekStartDate: string) => {
      setDeleteError(null);
      setDeleteTarget({ planId, weekStartDate });
    },
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete: () => void confirmDelete(),
    isDeleting,
    deleteError,
  };
}

export type NewPlanFlowState = ReturnType<typeof useNewPlanFlow>;
