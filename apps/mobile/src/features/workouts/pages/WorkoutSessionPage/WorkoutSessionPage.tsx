import { fill, getActiveLanguage, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { IconPlus } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { Button } from '../../../../components/common/Button/Button';
import { StageBackground } from '../../../../components/common/StageBackground/StageBackground';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useWakeLock } from '../../../../hooks/useWakeLock';
import { useToast } from '../../../../hooks/useToast';
import { ROUTES, workoutLogPath, workoutSummaryPath } from '../../../../app/config/routes';
import { ALL_DONE_OFFER_DELAY_MS, SYNC_RETRY_MS, VIBRATE_REST_OVER_MS } from '../../data/sessionConfig';
import { countDone, exerciseOf, firstOpenSetIn, nextOpenSet, nextOpenSetAfter } from '../../data/sessionSets';
import type { SessionModel, SessionSet, SetValuesByKey } from '../../data/sessionSets';
import { formatClock } from '../../data/workoutDisplay';
import { workoutCopy } from '../../copy';
import { buildBlockPhases } from '../../data/intervalTimeline';
import { unlockAudio } from '../../data/intervalSounds';
import type { IntervalPhase } from '../../data/intervalTimeline';
import { useIntervalRun } from '../../hooks/useIntervalRun';
import { useHoldTimer } from '../../hooks/useHoldTimer';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { FreeExerciseSheet } from '../../components/FreeExerciseSheet/FreeExerciseSheet';
import { IntervalTimer } from '../../components/IntervalTimer/IntervalTimer';
import { PlayerHeader } from '../../components/PlayerHeader/PlayerHeader';
import { PlayerTip } from '../../components/PlayerTip/PlayerTip';
import { PlayerExercise } from '../../components/PlayerExercise/PlayerExercise';
import { PlayerQueue } from '../../components/PlayerQueue/PlayerQueue';
import { RestSheet } from '../../components/RestSheet/RestSheet';
import type { RestNext } from '../../components/RestSheet/RestSheet';
import './WorkoutSessionPage.css';

type Dialog = 'menu' | 'confirmDiscard' | 'confirmFinish' | 'allDone' | 'nothingDone';

/** Best effort: Android vibrates, iOS Safari has no Vibration API. */
function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported.
  }
}

function scrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

/** What the rest sheet shows as "Next": the set's exercise and "Set 2 · 12 reps". */
function describeNext(model: SessionModel, values: SetValuesByKey, set: SessionSet): RestNext {
  const text = workoutCopy[getActiveLanguage()];
  const exercise = exerciseOf(model, set.planExerciseId);
  const name = exercise?.plan.exercise?.name ?? sharedCopy[getActiveLanguage()].log.exercise;
  const number = (exercise?.sets.findIndex((candidate) => candidate.key === set.key) ?? 0) + 1;
  const setValues = values[set.key];
  const detail =
    set.timed && setValues?.durationSec !== undefined
      ? fill(text.player.nextSeconds, { set: number, seconds: formatClock(setValues.durationSec) })
      : setValues?.reps !== undefined
        ? fill(text.player.nextReps, { set: number, reps: setValues.reps })
        : fill(text.player.nextSet, { set: number });
  return { name, detail };
}

/**
 * The active workout (PRD §5.2, direction B): full screen, one exercise (or superset) on screen,
 * per-set logging pre-filled by the server, the rest sheet, the "workout" queue, and every change
 * saved on the phone first and on the server right after.
 */
export function WorkoutSessionPage() {
  const { plural } = useI18n();
  const copy = useCopy(workoutCopy);
  const { logId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Only a fresh start (useStartWorkout) shows the tip; read once, so a reload or a resume doesn't.
  const [showTip] = useState(() => (location.state as { justStarted?: boolean } | null)?.justStarted === true);
  const { session, model, values, loadError, ended, syncState, rest, finishQueued, editSet, addSet, setCompleted, adjustRest, endRest, finish, discard, addExercise } =
    useWorkoutSession(logId);
  // A free workout (hers, no plan): exercises are added during the session.
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  // The set she is on: follows her (next after the one she ticked), else the first open one.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useWakeLock(session !== null && ended === null);

  // Interval blocks run hands-free; each finished work period logs its set (no normal rest).
  const interval = useIntervalRun({
    storageKey: `sistem.interval.session.${logId}`,
    enabled: session !== null && ended === null,
    onWorkDone: (phase: IntervalPhase) => {
      if (phase.setKey) setCompleted(phase.setKey, true, { durationSec: phase.durationSec }, { startRest: false });
    },
  });

  const hold = useHoldTimer((key, durationSec) => completeSet(key, { durationSec }));

  const restRemainingMs = useRestTimer({
    rest,
    onEnd: useCallback(() => {
      vibrate(VIBRATE_REST_OVER_MS);
      endRest();
      // The live toast says it politely; the sheet slides away.
      showToast(workoutCopy[getActiveLanguage()].player.restDone);
    }, [endRest, showToast]),
  });

  // Measured once per load; the elapsed clock adds device time to the server's "now".
  const serverOffsetMs = useMemo(() => (session ? new Date(session.serverTime).getTime() - Date.now() : 0), [session]);

  const focused = focusKey && model && !values[focusKey]?.completed ? (model.setByKey.get(focusKey) ?? null) : null;
  const currentSet = focused ?? (model ? nextOpenSet(model, values) : null);
  const currentBlockId = currentSet && model ? (model.blockIdByKey.get(currentSet.key) ?? null) : null;
  const openId = openBlockId ?? currentBlockId ?? model?.blocks[0]?.id ?? null;
  const openIndex = model ? Math.max(0, model.blocks.findIndex((block) => block.id === openId)) : 0;
  const openBlock = model?.blocks[openIndex] ?? null;
  const totalSets = model?.flow.length ?? 0;
  const doneSets = model ? countDone(model, values) : 0;

  const groups = useMemo(
    () =>
      model?.blocks.map((block) => ({
        id: block.id,
        name: block.exercises.map((exercise) => exercise.plan.exercise?.name ?? sharedCopy[getActiveLanguage()].log.exercise).join(' + '),
        sets: block.exercises.flatMap((exercise) => exercise.sets).map((set) => values[set.key]?.completed === true),
      })) ?? [],
    [model, values],
  );

  useEffect(() => {
    if (showTip) navigate(location.pathname, { replace: true, state: null });
    // Once, on arrival: clears the history entry's flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Finished or discarded (here or on another device): leave the session screen.
  useEffect(() => {
    if (!ended) return;
    navigate(ended.status === 'completed' ? workoutLogPath(logId) : ROUTES.TRAINEE_HOME, { replace: true });
  }, [ended, logId, navigate]);

  // Browsers play sound only after a tap: any tap on the session enables it — also for a rest
  // restored after the app was reopened.
  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio);
    return () => document.removeEventListener('pointerdown', unlockAudio);
  }, []);

  // All sets done: offer the finish once the last check has popped.
  const allDoneTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(allDoneTimer.current), []);

  function focusNextAfter(doneKey: string) {
    if (!model) return;
    const next = nextOpenSetAfter(model, values, doneKey);
    setFocusKey(next?.key ?? null);
    if (!next) {
      window.clearTimeout(allDoneTimer.current);
      allDoneTimer.current = window.setTimeout(() => setDialog('allDone'), ALL_DONE_OFFER_DELAY_MS);
      return;
    }
    // The exercise is done: the screen moves on to the next one (the rest sheet already says which).
    const nextBlockId = model.blockIdByKey.get(next.key) ?? null;
    if (nextBlockId !== openId) {
      setOpenBlockId(nextBlockId);
      scrollToTop();
    }
  }

  function completeSet(key: string, patch: { durationSec?: number } = {}) {
    setCompleted(key, true, patch);
    focusNextAfter(key);
  }

  function toggleSet(key: string) {
    if (hold.running?.key === key) hold.cancel();
    if (values[key]?.completed) setCompleted(key, false);
    else completeSet(key);
  }

  function jumpTo(blockId: string) {
    if (!model) return;
    setOpenBlockId(blockId);
    setFocusKey(firstOpenSetIn(model, values, blockId)?.key ?? null);
    scrollToTop();
  }

  async function doFinish() {
    setDialog(null);
    setActionError(null);
    setIsFinishing(true);
    const result = await finish();
    setIsFinishing(false);
    if (result.kind === 'finished') navigate(workoutSummaryPath(result.log.id), { replace: true });
    else if (result.kind === 'error') setActionError(result.message);
  }

  // Finish tapped while offline: retry when the connection is back.
  const doFinishRef = useRef(doFinish);
  doFinishRef.current = doFinish;
  useEffect(() => {
    if (!finishQueued || !session) return;
    function retry() {
      if (navigator.onLine) void doFinishRef.current();
    }
    retry();
    window.addEventListener('online', retry);
    const timer = window.setInterval(retry, SYNC_RETRY_MS);
    return () => {
      window.removeEventListener('online', retry);
      window.clearInterval(timer);
    };
  }, [finishQueued, session]);

  function handleFinishClick() {
    if (doneSets === 0) setDialog('nothingDone');
    else if (doneSets < totalSets) setDialog('confirmFinish');
    else void doFinish();
  }

  async function handleDiscard() {
    setIsDiscarding(true);
    const error = await discard();
    setIsDiscarding(false);
    if (error) setActionError(error);
    setDialog(null);
  }

  if (!session || !model) {
    return (
      <AppShell hideTabBar>
        <div className="wp-state">
          <StateMessage>{loadError ?? copy.session.loading}</StateMessage>
          {loadError && (
            <Button variant="secondary" onClick={() => navigate(ROUTES.TRAINEE_HOME)}>
              {copy.session.leave}
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  const statusLine = finishQueued ? copy.session.finishQueued : syncState === 'offline' ? copy.session.offline : null;
  const restNext = rest && currentSet ? describeNext(model, values, currentSet) : null;

  return (
    <AppShell hideTabBar bleed>
      <StageBackground />
      <div className="wp">
        <h1 className="wp-visually-hidden">{session.log.workoutTitle}</h1>
        <PlayerHeader
          workoutTitle={session.log.workoutTitle}
          startedAt={session.log.startedAt}
          serverOffsetMs={serverOffsetMs}
          groups={groups}
          currentGroupId={openId}
          exerciseNumber={openIndex + 1}
          doneSets={doneSets}
          totalSets={totalSets}
          onEnd={handleFinishClick}
          onMenu={() => setDialog('menu')}
        />

        <div className="wp-body">
          {statusLine && <p className="wp-status">{statusLine}</p>}
          {actionError && (
            <p className="wp-error" role="alert">
              {actionError}
            </p>
          )}
          {showTip && <PlayerTip />}
          {session.workout.notes && (
            <p className="wp-notes" dir="auto">
              {session.workout.notes}
            </p>
          )}

          {openBlock && (
            <PlayerExercise
              block={openBlock}
              isCurrent={openBlock.id === currentBlockId}
              values={values}
              currentKey={currentSet?.key ?? null}
              lastPerformance={session.lastPerformance}
              hold={hold.running}
              onAddSet={addSet}
              onStartInterval={() => {
                endRest();
                hold.cancel();
                interval.start(buildBlockPhases(openBlock, values));
              }}
              onEdit={editSet}
              onToggle={toggleSet}
              onStartHold={(key) => {
                const targetSec = values[key]?.durationSec;
                if (targetSec) hold.start(key, targetSec);
              }}
              onStopHold={hold.stop}
            />
          )}

          {session.log.source === 'free' && model.blocks.length === 0 && (
            <div className="wp-free-empty">
              <h2 className="wp-free-empty-title">{copy.free.emptyTitle}</h2>
              <p className="wp-free-empty-text">{copy.free.emptyText}</p>
            </div>
          )}

          <PlayerQueue items={groups} currentId={openId} onSelect={jumpTo} />

          {session.log.source === 'free' && (
            <button type="button" className="wp-free-add" onClick={() => setIsPickerOpen(true)}>
              <IconPlus size={18} aria-hidden="true" />
              {copy.free.addExercise}
            </button>
          )}
        </div>
      </div>

      {/* Portaled: the page-enter animation transforms <main>, which would pin a fixed footer to <main>. */}
      {createPortal(
        <div className="wp-footer">
          <button type="button" className="wp-finish" onClick={handleFinishClick} disabled={isFinishing} aria-busy={isFinishing || undefined}>
            {copy.session.finish}
            <small dir="ltr">
              {doneSets}/{totalSets}
            </small>
          </button>
        </div>,
        document.body,
      )}

      {session.log.source === 'free' && (
        <FreeExerciseSheet
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onPick={async (exercise) => {
            const problem = await addExercise(exercise.id);
            if (!problem) showToast(fill(workoutCopy[getActiveLanguage()].free.added, { name: exercise.name }));
            return problem;
          }}
        />
      )}

      <RestSheet rest={rest && restRemainingMs !== null && restRemainingMs > 0 ? rest : null} remainingMs={restRemainingMs} next={restNext} onAdjust={adjustRest} onSkip={endRest} />
      <Toast message={toastMessage} />

      {interval.run && (
        <IntervalTimer
          run={interval.run}
          remainingMs={interval.remainingMs}
          catchUpCount={interval.catchUpCount}
          doneLabel={copy.interval.backToWorkout}
          onPause={interval.pause}
          onResume={interval.resume}
          onSkip={interval.skip}
          onAnswerCatchUp={interval.answerCatchUp}
          onClose={interval.close}
        />
      )}

      <BottomSheet isOpen={dialog === 'menu'} onClose={() => setDialog(null)} labelledBy="wp-menu-title">
        <div className="wp-sheet">
          <h2 className="wp-sheet-title display-title" id="wp-menu-title">
            {copy.session.menuTitle}
          </h2>
          <div className="wp-sheet-actions">
            <button type="button" className="wp-sheet-button" onClick={() => navigate(ROUTES.TRAINEE_HOME)}>
              {copy.session.leave}
            </button>
            <button type="button" className="wp-sheet-button" onClick={() => navigate(ROUTES.INTERVAL_TIMER)}>
              {copy.interval.timerTitle}
            </button>
            <button type="button" className="wp-sheet-button wp-sheet-button-danger" onClick={() => setDialog('confirmDiscard')}>
              {copy.session.discard}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={dialog === 'confirmDiscard'} onClose={() => setDialog(null)} labelledBy="wp-discard-title">
        <div className="wp-sheet">
          <h2 className="wp-sheet-title display-title" id="wp-discard-title">
            {copy.session.confirmDiscardTitle}
          </h2>
          <p className="wp-sheet-text">{copy.session.confirmDiscard}</p>
          <div className="wp-sheet-actions">
            <button type="button" className="wp-sheet-button wp-sheet-button-danger-solid" onClick={() => void handleDiscard()} disabled={isDiscarding}>
              {copy.session.discardConfirm}
            </button>
            <button type="button" className="wp-sheet-button" onClick={() => setDialog(null)} disabled={isDiscarding}>
              {copy.session.cancel}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={dialog === 'confirmFinish' || dialog === 'allDone'} onClose={() => setDialog(null)} labelledBy="wp-finish-title">
        <div className="wp-sheet">
          <h2 className="wp-sheet-title display-title" id="wp-finish-title">
            {copy.player.confirmTitle}
          </h2>
          <p className="wp-sheet-text">{dialog === 'allDone' ? copy.player.allDone : plural(copy.player.confirmLeft, totalSets - doneSets)}</p>
          <div className="wp-sheet-actions">
            <button type="button" className="wp-sheet-button wp-sheet-button-primary" onClick={() => void doFinish()}>
              {copy.player.finishSave}
            </button>
            <button type="button" className="wp-sheet-button" onClick={() => setDialog(null)}>
              {copy.player.backToWorkout}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={dialog === 'nothingDone'} onClose={() => setDialog(null)} labelledBy="wp-nothing-title">
        <div className="wp-sheet">
          <h2 className="wp-sheet-title display-title" id="wp-nothing-title">
            {copy.session.nothingDoneTitle}
          </h2>
          <p className="wp-sheet-text">{copy.session.nothingDone}</p>
          <div className="wp-sheet-actions">
            <button type="button" className="wp-sheet-button wp-sheet-button-primary" onClick={() => setDialog(null)}>
              {copy.session.ok}
            </button>
          </div>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
