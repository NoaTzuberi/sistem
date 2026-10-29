import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CoachPlan, PlanIssue, PublishPlanNote } from '@sistem/types';
import { PlanRequestError } from '@sistem/api-client';
import { deletePlan, publishPlan, savePlan, unpublishPlan } from '../../../services/coach/coachService';
import { AUTOSAVE_DELAY_MS } from '../data/planDefaults';
import { assignSavedIds, draftFromPlan, keysOf, toPayload } from '../planDraft';
import type { PlanDraft } from '../types';
import { getActiveLanguage } from '@sistem/shared';
import { planBuilderCopy } from '../copy';

// Read when the text is needed (callbacks run later): the language on screen at that moment.
const text = () => planBuilderCopy[getActiveLanguage()];

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

/**
 * The editing state of one plan: the draft, saving it, and publish / unpublish /
 * delete.
 *  - A DRAFT plan saves itself a few seconds after the last change (and when the
 *    page is left).
 *  - A PUBLISHED plan is live for the trainee, so it is only saved when the coach
 *    presses Save.
 * The server decides what is valid; its issues are kept here for the page to show.
 */
export function usePlanEditor(traineeId: string, initialPlan: CoachPlan) {
  const planId = initialPlan.id;
  const [plan, setPlan] = useState(initialPlan);
  const [draft, setDraftState] = useState(() => draftFromPlan(initialPlan));
  const [isSaving, setIsSaving] = useState(false);
  const [issues, setIssues] = useState<PlanIssue[]>([]);
  const [error, setError] = useState<string>();

  // The refs are always current, also between a state update and its render — a save
  // that starts right after another one must send the ids the first one assigned.
  const draftRef = useRef(draft);
  const savedJsonRef = useRef(JSON.stringify(toPayload(draft)));
  const [savedJson, setSavedJson] = useState(savedJsonRef.current);
  // The last payload the server refused: not retried until the draft changes.
  const [failedJson, setFailedJson] = useState<string | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const autosaveOnLeave = useRef(initialPlan.status === 'draft');

  const updateDraft = useCallback((update: (current: PlanDraft) => PlanDraft) => {
    draftRef.current = update(draftRef.current);
    setDraftState(draftRef.current);
  }, []);

  const applyPlan = useCallback((next: CoachPlan) => {
    autosaveOnLeave.current = next.status === 'draft';
    setPlan(next);
  }, []);

  const fail = useCallback((failure: unknown, fallback: string) => {
    setIssues(failure instanceof PlanRequestError ? failure.issues : []);
    setError(failure instanceof Error ? failure.message : fallback);
  }, []);

  /** Saves what changed since the last save. Resolves to false when the server refused it. */
  const save = useCallback(async (): Promise<boolean> => {
    // One save at a time: wait for the running one, then send what changed since.
    while (inFlight.current) await inFlight.current;

    const sent = draftRef.current;
    const payload = toPayload(sent);
    const sentJson = JSON.stringify(payload);
    if (sentJson === savedJsonRef.current) return true;

    const run = (async () => {
      setIsSaving(true);
      try {
        const saved = await savePlan(traineeId, planId, payload);
        const sentKeys = keysOf(sent);
        savedJsonRef.current = JSON.stringify(toPayload(assignSavedIds(sent, sentKeys, saved)));
        setSavedJson(savedJsonRef.current);
        updateDraft((current) => assignSavedIds(current, sentKeys, saved));
        applyPlan(saved);
        setFailedJson(null);
        setIssues([]);
        setError(undefined);
        return true;
      } catch (failure) {
        setFailedJson(sentJson);
        fail(failure, text().saveError);
        return false;
      } finally {
        inFlight.current = null;
        setIsSaving(false);
      }
    })();
    inFlight.current = run;
    return run;
  }, [traineeId, planId, updateDraft, applyPlan, fail]);

  const payloadJson = useMemo(() => JSON.stringify(toPayload(draft)), [draft]);
  const isDirty = payloadJson !== savedJson;
  const isDraft = plan.status === 'draft';

  // Autosave (drafts only).
  useEffect(() => {
    if (!isDraft || !isDirty || isSaving || payloadJson === failedJson) return;
    const timer = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isDraft, isDirty, isSaving, payloadJson, failedJson, save]);

  // Leaving the builder inside the dashboard: send the last changes of a draft.
  useEffect(
    () => () => {
      if (autosaveOnLeave.current) void save();
    },
    [save],
  );

  // Closing or reloading the tab with unsaved changes: let the browser ask first.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  /** `note` = the message + tip sent with it (the publish sheet). */
  const publish = useCallback(async (note?: PublishPlanNote): Promise<boolean> => {
    if (!(await save())) return false;
    try {
      applyPlan(await publishPlan(traineeId, planId, note));
      setIssues([]);
      setError(undefined);
      return true;
    } catch (failure) {
      fail(failure, text().publishError);
      return false;
    }
  }, [traineeId, planId, save, applyPlan, fail]);

  const unpublish = useCallback(async (): Promise<boolean> => {
    try {
      applyPlan(await unpublishPlan(traineeId, planId));
      setError(undefined);
      return true;
    } catch (failure) {
      fail(failure, text().unpublishError);
      return false;
    }
  }, [traineeId, planId, applyPlan, fail]);

  const remove = useCallback(async (): Promise<boolean> => {
    // Nothing may be saved into a plan that is being deleted.
    autosaveOnLeave.current = false;
    while (inFlight.current) await inFlight.current;
    try {
      await deletePlan(traineeId, planId);
      return true;
    } catch (failure) {
      autosaveOnLeave.current = plan.status === 'draft';
      fail(failure, text().deleteError);
      return false;
    }
  }, [traineeId, planId, plan.status, fail]);

  let saveStatus: SaveStatus = 'saved';
  if (isSaving) saveStatus = 'saving';
  else if (isDirty) saveStatus = payloadJson === failedJson ? 'error' : 'unsaved';

  return { plan, draft, updateDraft, saveStatus, isDirty, issues, error, save, publish, unpublish, remove };
}
