import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AiPlanExercise, AiSplitOption, AiTrainingRecommendation, CoachPlan, ExerciseFacts, TrainingSlot } from '@sistem/types';
import { DUPLICATE_WEEK_STATE, cardioBuilderPath, traineePath } from '../../../../app/config/routes';
import { listTraineeCardio } from '../../../../services/cardio/cardioService';
import { sessionInWeek } from '../../../cardio/data/cardioDraft';
import type { ActionMenuItem } from '../../../../components/common/ActionMenu/ActionMenu';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { fill, findWorkoutType, formatPlural, formatWeekSpan, sharedCopy, splitLabel, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { PublishModal } from '../../../../components/common/PublishModal/PublishModal';
import type { PublishSummary } from '../../../../components/common/PublishModal/PublishModal';
import { appCopy } from '../../../../copy';
import { usePublishFlow } from '../../../../hooks/usePublishFlow';
import { usePlanEditor } from '../../hooks/usePlanEditor';
import { workoutColorClass } from '../../data/workoutColors';
import { workoutTabId } from '../../data/workoutTabs';
import { addExerciseToWorkout, duplicateWorkout, moveItem, newWorkout } from '../../planDraft';
import type { DraftWorkout } from '../../types';
import { BuilderHeader } from '../BuilderHeader/BuilderHeader';
import { LibrarySheet } from '../LibrarySheet/LibrarySheet';
import { StartCards } from '../StartCards/StartCards';
import { WorkoutCard } from '../WorkoutCard/WorkoutCard';
import { WorkoutTabs } from '../WorkoutTabs/WorkoutTabs';
import { useLatestAiDraft } from '../../../aiDraft/hooks/useLatestAiDraft';
import { applyAiDraft, draftWorkoutsFromSplit } from '../../../aiDraft/aiDraftToPlan';
import { useTrainingConfig } from '../../../trainingConfig/useTrainingConfig';
import type { SplitOnlyRequest } from '../../types';
import { AiDraftSheet } from '../../../aiDraft/components/AiDraftSheet/AiDraftSheet';
import { aiDraftCopy } from '../../../aiDraft/copy';
import { traineesCopy } from '../../../trainees/copy';
import './PlanEditor.css';
import { planBuilderCopy } from '../../copy';

interface PlanEditorProps {
  traineeId: string;
  traineeName: string;
  /** The trainee's current week, from the server — labels this plan 'This week' / 'Next week'. */
  currentWeekStart: string;
  initialPlan: CoachPlan;
  /** Fill this (empty, draft) plan from that AI draft once it is loaded ("Use full AI plan"). */
  loadAiDraftId?: string;
  /** Phase 12b "Use split only": empty typed workouts of that split, the AI's picks as slot suggestions. */
  splitOnly?: SplitOnlyRequest;
}

export function PlanEditor({ traineeId, traineeName, currentWeekStart, initialPlan, loadAiDraftId, splitOnly }: PlanEditorProps) {
  const language = useLanguage();
  const aiText = useCopy(aiDraftCopy);
  const copy = useCopy(planBuilderCopy);
  const traineeText = useCopy(traineesCopy);
  const navigate = useNavigate();
  const location = useLocation();
  const ai = useLatestAiDraft(traineeId);
  const { plan, draft, updateDraft, saveStatus, isDirty, issues, error, save, publish, unpublish, remove } = usePlanEditor(
    traineeId,
    initialPlan,
  );
  const [selectedKey, setSelectedKey] = useState<string | undefined>(draft.workouts[0]?.key);
  const [isBusy, setIsBusy] = useState(false);
  const config = useTrainingConfig();
  // The two side sheets. At most one is open; closed, neither is in the page.
  const [openSheet, setOpenSheet] = useState<'library' | 'ai' | null>(null);
  // The slot the library was opened for ("+ Add" on a slot); undefined = any exercise.
  const [librarySlot, setLibrarySlot] = useState<TrainingSlot>();
  const { toastMessage, showToast } = useToast();
  const panelId = useId();
  // This week's cardio sessions, shown next to the workouts; each opens its own builder.
  const loadCardio = useCallback(() => listTraineeCardio(traineeId), [traineeId]);
  const cardio = useLoad(loadCardio, '');
  const weekCardio = (cardio.data?.sessions ?? []).filter((session) => sessionInWeek(session, initialPlan.weekStartDate));

  const isPublished = plan.status === 'published';
  const { workouts } = draft;
  // The workout on screen (the library adds to it); without a valid selection, the first.
  const selected = workouts.find((workout) => workout.key === selectedKey) ?? workouts[0];
  const selectedIndex = selected ? workouts.indexOf(selected) : -1;
  const planIssues = issues.filter((issue) => issue.workoutIndex === undefined);
  const plansTab = traineePath(traineeId, 'plans');
  const sharedText = useCopy(sharedCopy);
  const appText = useCopy(appCopy);
  // Publishing goes through the designed modal (confirm → the existing publish call → celebration).
  const publishFlow = usePublishFlow(() => runAction(publish));
  const exerciseCount = workouts.reduce((total, workout) => total + workout.exercises.length, 0);
  const publishSummary: PublishSummary = {
    kind: 'plan',
    title: [plan.splitId ? splitLabel(plan.splitId, language) : null, formatWeekSpan(plan.weekStartDate, language)].filter(Boolean).join(' · '),
    chips: [
      { id: 'workouts', label: formatPlural(language, appText.publish.workouts, workouts.length) },
      { id: 'exercises', label: formatPlural(language, sharedText.coach.exerciseCount, exerciseCount) },
    ],
    workouts: workouts.map((workout, index) => ({ id: workout.key, name: workout.title, colorClass: workoutColorClass(index) })),
  };
  // Only one workout is on screen, so the tabs mark the ones the server found a problem in.
  const issueKeys = useMemo(
    () => new Set(issues.flatMap((issue) => (issue.workoutIndex !== undefined && workouts[issue.workoutIndex] ? [workouts[issue.workoutIndex].key] : []))),
    [issues, workouts],
  );

  function setWorkouts(update: (current: DraftWorkout[]) => DraftWorkout[]) {
    updateDraft((current) => ({ ...current, workouts: update(current.workouts) }));
  }

  function loadAiDraft(recommendation: AiTrainingRecommendation) {
    if (!recommendation.output) return;
    // The editor's draft is replaced; autosave stores it through the normal plan rules.
    let firstKey: string | undefined;
    updateDraft((current) => {
      const next = applyAiDraft(current, recommendation);
      firstKey = next.workouts[0]?.key;
      return next;
    });
    setSelectedKey(firstKey);
  }

  /** "Use split only": one typed, empty workout per day of the split. */
  function loadSplit(splitId: string, daysPerWeek: number, recommendationId: string | undefined) {
    if (!config) return 0;
    const linked = recommendationId && ai.latest?.id === recommendationId ? ai.latest.output : null;
    const splitWorkouts = draftWorkoutsFromSplit(config, splitId, daysPerWeek, language, linked);
    updateDraft((current) => ({
      ...current,
      splitId,
      aiRecommendationId: recommendationId ?? current.aiRecommendationId,
      workouts: splitWorkouts,
    }));
    setSelectedKey(splitWorkouts[0]?.key);
    return splitWorkouts.length;
  }

  // The AI's picks for a workout of the linked draft (same position and workout type): offered in its empty slots.
  function suggestionsFor(index: number): AiPlanExercise[] | undefined {
    const output = ai.latest?.id === draft.aiRecommendationId ? ai.latest?.output : undefined;
    const aiWorkout = output?.splitId ? output.workouts[index] : undefined;
    return aiWorkout && aiWorkout.workoutType === workouts[index]?.workoutType ? aiWorkout.exercises : undefined;
  }

  /** The AI sheet's two "load" paths replace the plan's workouts — ask first when there are any. */
  function confirmReplace(): boolean {
    return workouts.length === 0 || window.confirm(aiText.training.replaceConfirm);
  }

  function handleUseFullPlan(recommendation: AiTrainingRecommendation) {
    if (isPublished || !confirmReplace()) return;
    loadAiDraft(recommendation);
    setOpenSheet(null);
    showToast(copy.toastAiLoaded);
  }

  function handleUseSplitOnly(option: Pick<AiSplitOption, 'splitId' | 'daysPerWeek'>, recommendation: AiTrainingRecommendation) {
    if (isPublished || !config || !confirmReplace()) return;
    const count = loadSplit(option.splitId, option.daysPerWeek, recommendation.id);
    setOpenSheet(null);
    showToast(fill(copy.toastSplitLoaded, { count }));
  }

  // "Use full AI plan" / "Use split only" from the Plans tab: once, into the empty draft; the
  // router state is cleared so a reload never loads it again.
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current) return;
    if (loadAiDraftId && ai.ready?.id === loadAiDraftId) {
      autoLoaded.current = true;
      if (!isPublished && workouts.length === 0) loadAiDraft(ai.ready);
    } else if (splitOnly && config && (!splitOnly.recommendationId || !ai.isLoading)) {
      autoLoaded.current = true;
      if (!isPublished && workouts.length === 0) loadSplit(splitOnly.splitId, splitOnly.daysPerWeek, splitOnly.recommendationId);
    } else return;
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the draft / config arrives
  }, [loadAiDraftId, splitOnly, ai.ready, ai.isLoading, config]);

  /** A new free workout, without a day yet — its day and type are chosen inside it. */
  function handleAddWorkout() {
    const workout = newWorkout(fill(copy.workoutPlaceholder, { n: workouts.length + 1 }));
    setWorkouts((current) => [...current, workout]);
    setSelectedKey(workout.key);
  }

  function handleDuplicateWorkout(index: number) {
    const source = workouts[index];
    const duplicate = duplicateWorkout(source);
    setWorkouts((current) => [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)]);
    setSelectedKey(duplicate.key);
    showToast(fill(copy.toastDuplicated, { name: source.title.trim() || copy.untitledWorkout }));
  }

  function handleRemoveWorkout(workout: DraftWorkout) {
    setWorkouts((current) => current.filter((other) => other.key !== workout.key));
    showToast(fill(copy.toastRemoved, { name: workout.title.trim() || copy.untitledWorkout }));
  }

  function handleClearWeek() {
    if (!window.confirm(copy.clearWeekConfirm)) return;
    setWorkouts(() => []);
  }

  function openLibrary(slot?: TrainingSlot) {
    setLibrarySlot(slot);
    setOpenSheet('library');
  }

  // From the library sheet. Opened for a slot: into that slot — refused once it is full. Otherwise
  // into the first slot that fits it (typed workout), else "Other".
  function handleAddExercise(facts: ExerciseFacts): boolean {
    if (!selected) return false;
    if (librarySlot && selected.exercises.filter((exercise) => exercise.slotId === librarySlot.id).length >= librarySlot.maxExercises) {
      showToast(copy.slotFull);
      return false;
    }
    const next = addExerciseToWorkout(selected, facts, findWorkoutType(config, selected.workoutType), librarySlot?.id);
    setWorkouts((current) => current.map((workout) => (workout.key === next.key ? next : workout)));
    showToast(fill(copy.toastAdded, { name: facts.name }));
    return true;
  }

  async function runAction(action: () => Promise<boolean>): Promise<boolean> {
    setIsBusy(true);
    try {
      return await action();
    } finally {
      setIsBusy(false);
    }
  }

  function handlePublish() {
    publishFlow.open();
  }

  function handleUnpublish() {
    if (isDirty && !window.confirm(copy.unpublishDirtyConfirm)) return;
    if (!isDirty && !window.confirm(fill(copy.unpublishConfirm, { name: traineeName }))) return;
    void runAction(unpublish);
  }

  async function handleDelete() {
    if (!window.confirm(copy.deleteConfirm)) return;
    if (await runAction(remove)) navigate(plansTab, { replace: true });
  }

  // "Duplicate last week" is the server's own flow: the trainee's week picker, in duplicate mode.
  function goDuplicateWeek() {
    navigate(plansTab, { state: DUPLICATE_WEEK_STATE });
  }

  const menuItems: ActionMenuItem[] = [
    { id: 'duplicate-week', label: traineeText.duplicateLastWeek, onSelect: goDuplicateWeek },
    { id: 'ai', label: aiText.training.title, onSelect: () => setOpenSheet('ai') },
    ...(isPublished
      ? [{ id: 'unpublish', label: copy.unpublish, disabled: plan.locked || isBusy, onSelect: handleUnpublish }]
      : [{ id: 'save', label: copy.saveDraft, disabled: !isDirty || isBusy || saveStatus === 'saving', onSelect: () => void save() }]),
    { id: 'clear', label: copy.clearWeek, disabled: workouts.length === 0, onSelect: handleClearWeek },
    { id: 'delete', label: copy.delete, danger: true, disabled: plan.locked || isBusy, onSelect: () => void handleDelete() },
  ];

  return (
    <div className="plan-editor">
      <Link className="plan-back" to={plansTab}>
        {fill(copy.backToName, { name: traineeName })}
      </Link>

      <BuilderHeader
        traineeId={traineeId}
        traineeName={traineeName}
        currentWeekStart={currentWeekStart}
        plan={plan}
        saveStatus={saveStatus}
        isDirty={isDirty}
        isBusy={isBusy}
        menuItems={menuItems}
        onSave={() => void save()}
        onPublish={() => void handlePublish()}
      />

      {/* Only what she must know: a published plan is live, so its changes wait for "Save changes". */}
      {(isPublished || plan.locked) && (
        <p className="plan-mode-note">
          {isPublished && copy.liveNote}
          {plan.locked && copy.lockedNote}
        </p>
      )}

      {(error || planIssues.length > 0) && (
        <div className="plan-errors" role="alert">
          {issues.length > 0 ? (
            <>
              <p className="plan-errors-title">{copy.notSaved}</p>
              {planIssues.length > 0 && (
                <ul className="plan-errors-list">
                  {planIssues.map((issue) => (
                    <li key={issue.message}>{issue.message}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="plan-errors-title">{error}</p>
          )}
        </div>
      )}

      {selected ? (
        <>
          <WorkoutTabs
            workouts={workouts}
            selectedKey={selected.key}
            issueKeys={issueKeys}
            panelId={panelId}
            onSelect={setSelectedKey}
            onAdd={handleAddWorkout}
            cardioSessions={weekCardio}
            cardioPath={(sessionId) => cardioBuilderPath(traineeId, initialPlan.id, sessionId)}
            onAddCardio={() => navigate(cardioBuilderPath(traineeId, initialPlan.id))}
          />
          <div id={panelId} role="tabpanel" aria-labelledby={workoutTabId(selected.key)}>
            {/* Keyed by workout: another workout starts with its rows closed. */}
            <WorkoutCard
              key={selected.key}
              traineeId={traineeId}
              workout={selected}
              colorClass={workoutColorClass(selectedIndex)}
              config={config}
              suggestions={suggestionsFor(selectedIndex)}
              index={selectedIndex}
              count={workouts.length}
              issues={issues.filter((issue) => issue.workoutIndex === selectedIndex)}
              onChange={(next) => setWorkouts((current) => current.map((other) => (other.key === next.key ? next : other)))}
              onMove={(direction) => setWorkouts((current) => moveItem(current, selectedIndex, selectedIndex + direction))}
              onDuplicate={() => handleDuplicateWorkout(selectedIndex)}
              onRemove={() => handleRemoveWorkout(selected)}
              onExerciseRemoved={(name) => showToast(fill(copy.toastRemoved, { name }))}
              onAddExercise={openLibrary}
            />
          </div>
        </>
      ) : (
        <StartCards onDuplicateWeek={goDuplicateWeek} onAiDraft={() => setOpenSheet('ai')} onFromScratch={handleAddWorkout} />
      )}

      <label className="plan-notes">
        <span className="plan-notes-label">{copy.planNotes}</span>
        <textarea
          className="plan-notes-input"
          rows={2}
          dir="auto"
          value={draft.notes}
          onChange={(event) => {
            const notes = event.target.value;
            updateDraft((current) => ({ ...current, notes }));
          }}
        />
      </label>

      <LibrarySheet
        isOpen={openSheet === 'library' && selected !== undefined}
        onClose={() => setOpenSheet(null)}
        traineeId={traineeId}
        targetTitle={selected?.title ?? ''}
        targetSlot={librarySlot && selected?.workoutType ? { workoutType: selected.workoutType, slot: librarySlot } : undefined}
        onAdd={handleAddExercise}
      />
      <AiDraftSheet
        isOpen={openSheet === 'ai'}
        onClose={() => setOpenSheet(null)}
        traineeId={traineeId}
        ai={ai}
        config={config}
        linkedRecommendationId={draft.aiRecommendationId}
        canApply={!isPublished && config !== null}
        onUseFullPlan={handleUseFullPlan}
        onUseSplitOnly={handleUseSplitOnly}
      />
      <Toast message={toastMessage} />
      <PublishModal
        flow={publishFlow}
        traineeName={traineeName}
        summary={publishSummary}
        onOpenProfile={() => {
          publishFlow.close();
          navigate(plansTab);
        }}
      />
    </div>
  );
}
