import { fill, useCopy, useI18n, getActiveLanguage, isolateLtr } from '@sistem/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Button } from '../../../../components/common/Button/Button';
import { Modal } from '../../../../components/common/Modal/Modal';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useWakeLock } from '../../../../hooks/useWakeLock';
import { ROUTES, workoutLogPath, workoutSummaryPath } from '../../../../app/config/routes';
import { REST_LATE_BEEP_MS, REST_OVER_NOTICE_MS, SYNC_RETRY_MS, VIBRATE_SET_DONE_MS } from '../../data/sessionConfig';
import { countDone, nextOpenSet, nextOpenSetAfter } from '../../data/sessionSets';
import type { SessionModel } from '../../data/sessionSets';
import { workoutCopy } from '../../copy';
import { buildBlockPhases } from '../../data/intervalTimeline';
import { beep, isCountdownBeep, isSoundMuted, unlockAudio } from '../../data/intervalSounds';
import type { IntervalPhase } from '../../data/intervalTimeline';
import { useIntervalRun } from '../../hooks/useIntervalRun';
import { IntervalTimer } from '../../components/IntervalTimer/IntervalTimer';
import { SoundToggle } from '../../components/SoundToggle/SoundToggle';
import { useCountdown } from '../../hooks/useCountdown';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { RestBar } from '../../components/RestBar/RestBar';
import { SessionBlock } from '../../components/SessionBlock/SessionBlock';
import { SessionClock } from '../../components/SessionClock/SessionClock';
import { FocusTip } from '../../components/FocusTip/FocusTip';
import { nameScript } from '../../data/weekPlanDisplay';
import './WorkoutSessionPage.css';

type Dialog = 'menu' | 'confirmDiscard' | 'confirmFinish' | 'nothingDone';

interface Hold {
  key: string;
  startedAt: number;
  endsAt: number;
  targetSec: number;
}

/** Best effort: Android vibrates, iOS Safari has no Vibration API. */
function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported.
  }
}

/** "Squat · set 2" — what comes next, for the "Rest over" notice. */
function describeSet(model: SessionModel, key: string): string {
  for (const block of model.blocks) {
    for (const exercise of block.exercises) {
      const index = exercise.sets.findIndex((set) => set.key === key);
      if (index !== -1) return `${exercise.plan.exercise?.name ?? 'Exercise'} · set ${index + 1}`;
    }
  }
  return '';
}

/**
 * The active workout (PRD §5.2): full screen, one exercise (or superset) open at a
 * time, per-set logging pre-filled by the server, an optional rest timer, and every
 * change saved on the phone first and on the server right after.
 */
export function WorkoutSessionPage() {
  const { plural } = useI18n();
  const copy = useCopy(workoutCopy);
  const { logId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Only a fresh start (useStartWorkout) shows the Focus tip; read once, so a reload or
  // a later visit (resume) doesn't show it again.
  const [showFocusTip] = useState(() => (location.state as { justStarted?: boolean } | null)?.justStarted === true);
  const {
    session,
    model,
    values,
    loadError,
    ended,
    syncState,
    rest,
    finishQueued,
    editSet,
    setCompleted,
    adjustRest,
    endRest,
    finish,
    discard,
  } = useWorkoutSession(logId);

  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  // The set she is on: follows her (next after the one she ticked), else the first open one.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [scrollKey, setScrollKey] = useState<string | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  // The seconds of the running hold that already beeped (the countdown ticks 4× a second).
  const holdBeepedRef = useRef(new Set<number>());
  const [restOverText, setRestOverText] = useState<string | null>(null);
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

  const holdRemainingMs = useCountdown(hold?.endsAt ?? null);
  const restRemainingMs = useCountdown(rest?.endsAt ?? null);

  // Measured once per load; the elapsed clock adds device time to the server's "now".
  const serverOffsetMs = useMemo(
    () => (session ? new Date(session.serverTime).getTime() - Date.now() : 0),
    [session],
  );

  const focused = focusKey && model && !values[focusKey]?.completed ? (model.setByKey.get(focusKey) ?? null) : null;
  const currentSet = focused ?? (model ? nextOpenSet(model, values) : null);
  const currentBlockId = currentSet && model ? (model.blockIdByKey.get(currentSet.key) ?? null) : null;
  const openId = openBlockId ?? currentBlockId ?? model?.blocks[0]?.id ?? null;
  const totalSets = model?.flow.length ?? 0;
  const doneSets = model ? countDone(model, values) : 0;

  useEffect(() => {
    if (showFocusTip) navigate(location.pathname, { replace: true, state: null });
    // Once, on arrival: clears the history entry's flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Finished or discarded (here or on another device): leave the session screen.
  useEffect(() => {
    if (!ended) return;
    navigate(ended.status === 'completed' ? workoutLogPath(logId) : ROUTES.TRAINEE_HOME, { replace: true });
  }, [ended, logId, navigate]);

  useEffect(() => {
    if (!scrollKey) return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .getElementById(`session-set-${scrollKey}`)
        ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      setScrollKey(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollKey]);

  function focusNextAfter(doneKey: string) {
    if (!model) return;
    const next = nextOpenSetAfter(model, values, doneKey);
    setFocusKey(next?.key ?? null);
    if (!next) return;
    const nextBlockId = model.blockIdByKey.get(next.key) ?? null;
    if (nextBlockId !== openId) setOpenBlockId(nextBlockId);
    setScrollKey(next.key);
  }

  function completeSet(key: string, patch: { durationSec?: number } = {}) {
    setCompleted(key, true, patch);
    setRestOverText(null);
    focusNextAfter(key);
  }

  function toggleSet(key: string) {
    if (hold?.key === key) setHold(null);
    if (values[key]?.completed) setCompleted(key, false);
    else completeSet(key);
  }

  function startHold(key: string) {
    const targetSec = values[key]?.durationSec;
    if (!targetSec) return;
    // Inside the ▶ tap: lets the browser play the countdown beeps.
    unlockAudio();
    holdBeepedRef.current = new Set();
    const now = Date.now();
    setHold({ key, startedAt: now, endsAt: now + targetSec * 1000, targetSec });
  }

  function stopHold() {
    if (!hold) return;
    const heldSec = Math.max(1, Math.round((Date.now() - hold.startedAt) / 1000));
    setHold(null);
    completeSet(hold.key, { durationSec: Math.min(heldSec, hold.targetSec) });
  }

  // Same beeps as the interval timer: 10 s left (holds longer than 10 s), then 3-2-1.
  useEffect(() => {
    if (!hold || holdRemainingMs === null || holdRemainingMs === 0) return;
    const left = Math.ceil(holdRemainingMs / 1000);
    if (isCountdownBeep(left, hold.targetSec) && !holdBeepedRef.current.has(left)) {
      holdBeepedRef.current.add(left);
      beep('short', isSoundMuted());
    }
  }, [hold, holdRemainingMs]);

  // A hold that runs out: the longer beep (+ vibration), its full time is logged and the set is done.
  useEffect(() => {
    if (!hold || holdRemainingMs !== 0) return;
    beep('long', isSoundMuted());
    const { key, targetSec } = hold;
    setHold(null);
    completeSet(key, { durationSec: targetSec });
    // completeSet reads the latest render; running once per finished hold is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold, holdRemainingMs]);

  // Browsers play sound only after a tap: any tap on the session (✓, ±, …) enables it —
  // also for a rest restored after the app was reopened.
  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio);
    return () => document.removeEventListener('pointerdown', unlockAudio);
  }, []);

  // Rest countdown: the same beeps as holds and intervals — 10 s left (rests longer than
  // 10 s), then 3-2-1. A new rest or ±15s starts the pattern again.
  const restBeepedRef = useRef(new Set<number>());
  useEffect(() => {
    restBeepedRef.current = new Set();
  }, [rest?.endsAt]);
  useEffect(() => {
    if (!rest || restRemainingMs === null || restRemainingMs === 0) return;
    const left = Math.ceil(restRemainingMs / 1000);
    if (isCountdownBeep(left, rest.totalSec) && !restBeepedRef.current.has(left)) {
      restBeepedRef.current.add(left);
      beep('short', isSoundMuted());
    }
  }, [rest, restRemainingMs]);

  // Rest over: the longer beep, buzz, say what's next, then hide.
  useEffect(() => {
    if (!rest || restRemainingMs !== 0) return;
    // Ended long ago (the app was in the background): no late beep, just the notice.
    if (Date.now() - rest.endsAt < REST_LATE_BEEP_MS) beep('long', isSoundMuted());
    vibrate(VIBRATE_SET_DONE_MS);
    endRest();
    setRestOverText(currentSet && model ? fill(workoutCopy[getActiveLanguage()].session.restOverNext, { next: describeSet(model, currentSet.key) }) : workoutCopy[getActiveLanguage()].session.restOver);
  }, [currentSet, endRest, model, rest, restRemainingMs]);

  useEffect(() => {
    if (!restOverText) return;
    const timer = window.setTimeout(() => setRestOverText(null), REST_OVER_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [restOverText]);

  async function doFinish() {
    setDialog(null);
    setActionError(null);
    setIsFinishing(true);
    const result = await finish();
    setIsFinishing(false);
    if (result.kind === 'finished') {
      navigate(workoutSummaryPath(result.log.id), { replace: true });
    } else if (result.kind === 'error') {
      setActionError(result.message);
    }
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
        <div className="workout-session">
          {loadError ? (
            <StateMessage>{loadError}</StateMessage>
          ) : (
            <StateMessage>{copy.session.loading}</StateMessage>
          )}
          {loadError && (
            <Button variant="secondary" onClick={() => navigate(ROUTES.TRAINEE_HOME)}>
              {copy.session.leave}
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  const holdForRow = hold && holdRemainingMs !== null ? { key: hold.key, remainingMs: holdRemainingMs } : null;
  const statusLine = finishQueued ? copy.session.finishQueued : syncState === 'offline' ? copy.session.offline : null;

  return (
    <AppShell hideTabBar>
      <div className="workout-session">
        <header className="workout-session-header">
          <button
            type="button"
            className="workout-session-icon-button"
            aria-label={copy.session.leave}
            onClick={() => navigate(ROUTES.TRAINEE_HOME)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="workout-session-heading">
            <h1 className="workout-session-title">
              <bdi className="display-name" {...nameScript(session.log.workoutTitle)}>
                {session.log.workoutTitle}
              </bdi>
            </h1>
            <span className="workout-session-meta">
              <SessionClock startedAt={session.log.startedAt} serverOffsetMs={serverOffsetMs} /> ·{' '}
              {fill(copy.session.setsProgress, { progress: isolateLtr(`${doneSets} / ${totalSets}`) })}
            </span>
          </div>
          {/* One sound setting for every timer: rest, holds and intervals. */}
          <SoundToggle />
          <button
            type="button"
            className="workout-session-icon-button"
            aria-label={copy.session.menu}
            onClick={() => setDialog('menu')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
          <progress className="workout-session-progress" max={Math.max(1, totalSets)} value={doneSets} aria-hidden="true" />
        </header>

        {statusLine && <p className="workout-session-status">{statusLine}</p>}
        {actionError && <p className="workout-session-error">{actionError}</p>}
        {showFocusTip && <FocusTip />}

        {session.workout.notes && <p className="workout-session-notes" dir="auto">{session.workout.notes}</p>}

        <div className="workout-session-blocks">
          {model.blocks.map((block) => (
            <SessionBlock
              key={block.id}
              block={block}
              isOpen={block.id === openId}
              isCurrent={block.id === currentBlockId}
              values={values}
              currentKey={currentSet?.key ?? null}
              lastPerformance={session.lastPerformance}
              hold={holdForRow}
              onOpen={() => setOpenBlockId(block.id)}
              onStartInterval={() => {
                endRest();
                setHold(null);
                interval.start(buildBlockPhases(block, values));
              }}
              onEdit={editSet}
              onToggle={toggleSet}
              onStartHold={startHold}
              onStopHold={stopHold}
            />
          ))}
        </div>
      </div>

      {/* Portaled: the page-enter animation transforms <main>, which would pin a fixed
          footer to <main> instead of the screen while it runs. */}
      {createPortal(
        <footer className="workout-session-footer">
          {rest && restRemainingMs !== null && restRemainingMs > 0 && (
            <RestBar endsAt={rest.endsAt} remainingMs={restRemainingMs} totalSec={rest.totalSec} onAdjust={adjustRest} onSkip={endRest} />
          )}
          {restOverText && !rest && (
            <p className="workout-session-rest-over" role="status">
              {restOverText}
            </p>
          )}
          <div className="workout-session-finish">
            <Button className="workout-session-finish-button" onClick={handleFinishClick} loading={isFinishing}>
              {copy.session.finish}
            </Button>
          </div>
        </footer>,
        document.body,
      )}

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

      <Modal isOpen={dialog === 'menu'} onClose={() => setDialog(null)} variant="flat" title={copy.session.menuTitle}>
        <div className="workout-session-dialog">
          <Button variant="secondary" onClick={() => navigate(ROUTES.INTERVAL_TIMER)}>
            {copy.interval.timerTitle}
          </Button>
          <Button variant="danger" onClick={() => setDialog('confirmDiscard')}>
            {copy.session.discard}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={dialog === 'confirmDiscard'}
        onClose={() => setDialog(null)}
        variant="flat"
        title={copy.session.confirmDiscardTitle}
      >
        <div className="workout-session-dialog">
          <p className="workout-session-dialog-text">{copy.session.confirmDiscard}</p>
          <Button variant="danger" onClick={handleDiscard} loading={isDiscarding}>
            {copy.session.discardConfirm}
          </Button>
          <Button variant="ghost" onClick={() => setDialog(null)} disabled={isDiscarding}>
            {copy.session.cancel}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={dialog === 'confirmFinish'}
        onClose={() => setDialog(null)}
        variant="flat"
        title={copy.session.confirmFinishTitle}
      >
        <div className="workout-session-dialog">
          <p className="workout-session-dialog-text">{plural(copy.session.notDoneCount, totalSets - doneSets)}</p>
          <Button onClick={() => void doFinish()}>{copy.session.finishAnyway}</Button>
          <Button variant="ghost" onClick={() => setDialog(null)}>
            {copy.session.keepGoing}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={dialog === 'nothingDone'}
        onClose={() => setDialog(null)}
        variant="flat"
        title={copy.session.nothingDoneTitle}
      >
        <div className="workout-session-dialog">
          <p className="workout-session-dialog-text">{copy.session.nothingDone}</p>
          <Button onClick={() => setDialog(null)}>{copy.session.ok}</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
