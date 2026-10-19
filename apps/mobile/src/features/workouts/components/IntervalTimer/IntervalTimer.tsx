import type { Language } from '@sistem/types';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { fill, formatDuration, useCopy, useI18n, isolateLtr } from '@sistem/shared';
import { Button } from '../../../../components/common/Button/Button';
import { Modal } from '../../../../components/common/Modal/Modal';
import { countRoundsDone, nextWork } from '../../data/intervalTimeline';
import { unlockAudio } from '../../data/intervalSounds';
import type { IntervalRun } from '../../data/intervalTimeline';
import { formatClock } from '../../data/workoutDisplay';
import { workoutCopy } from '../../copy';
import { CountdownBar } from '../CountdownBar/CountdownBar';
import { SoundToggle } from '../SoundToggle/SoundToggle';
import './IntervalTimer.css';

interface IntervalTimerProps {
  run: IntervalRun;
  remainingMs: number;
  /** Work periods that ended while she was away, waiting for her answer (0 = none). */
  catchUpCount: number;
  /** The label of the button on the "done" screen. */
  doneLabel: string;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onAnswerCatchUp: (didThem: boolean) => void;
  /** Stop mid-run, or leave the "done" screen. */
  onClose: () => void;
  /** The free timer offers "Again" on the done screen (and logs no sets). */
  onAgain?: () => void;
}

/** "Next: Rest 10s → Burpees" — what comes after the current phase. */
function describeNext(run: IntervalRun, copy: (typeof workoutCopy)['he'], language: Language): string {
  const phase = run.phases[run.index];
  const following = run.phases[run.index + 1];
  if (!following) return copy.interval.lastOne;
  const upcomingWork = nextWork(run, run.index);
  if (following.kind === 'rest' && phase.kind === 'work') {
    // The arrow points along the reading direction (it is in the copy: → / ←).
    const then = upcomingWork?.label ? fill(copy.interval.thenLabel, { label: upcomingWork.label }) : '';
    return fill(copy.interval.nextRestThen, { rest: formatDuration(following.durationSec, language), label: then });
  }
  return upcomingWork?.label || copy.interval.nextWork;
}

/**
 * The interval run, full screen and hands-free (HIIT / Tabata): the phase, a huge
 * countdown, the exercise, the round and what's next. Portaled above the app so the
 * page-enter animation can't move it.
 */
export function IntervalTimer({
  run,
  remainingMs,
  catchUpCount,
  doneLabel,
  onPause,
  onResume,
  onSkip,
  onAnswerCatchUp,
  onClose,
  onAgain,
}: IntervalTimerProps) {
  const { language, plural } = useI18n();
  const copy = useCopy(workoutCopy);
  const [confirmStop, setConfirmStop] = useState(false);
  const phase = run.phases[run.index];
  const isPaused = run.pausedMs !== null;
  const durationMs = phase.durationSec * 1000;
  const showDone = run.finished && catchUpCount === 0;

  const subtitle =
    phase.kind === 'work'
      ? phase.label
      : phase.kind === 'ready'
        ? phase.label && fill(copy.interval.first, { label: phase.label })
        : '';

  return createPortal(
    // Any tap on the screen (re)enables sound — e.g. a run restored after the app was
    // reopened has had no Start tap.
    <div
      className={showDone ? 'interval-timer interval-timer-done' : `interval-timer interval-timer-${phase.kind}`}
      onPointerDown={unlockAudio}
    >
      <div className="interval-timer-top">
        {!showDone && (
          <button type="button" className="interval-timer-icon" aria-label={copy.interval.stop} onClick={() => setConfirmStop(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        <SoundToggle className="interval-timer-mute" />
      </div>

      {showDone ? (
        <div className="interval-timer-main">
          <span className="interval-timer-phase display-title">{copy.interval.doneTitle}</span>
          <span className="interval-timer-subtitle">
            {fill(copy.interval.roundsDone, { progress: isolateLtr(`${countRoundsDone(run)} / ${phase.rounds}`) })}
          </span>
          <div className="interval-timer-done-actions">
            <Button onClick={onClose}>{doneLabel}</Button>
            {onAgain && (
              <Button variant="secondary" onClick={onAgain}>
                {copy.interval.again}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="interval-timer-main" role="timer" aria-live="off">
            <span className="interval-timer-phase display-title">{copy.interval.phase[phase.kind]}</span>
            <span className="interval-timer-clock">{formatClock(Math.ceil(remainingMs / 1000))}</span>
            {isPaused && <span className="interval-timer-paused">{copy.interval.paused}</span>}
            {subtitle && <span className="interval-timer-subtitle">{subtitle}</span>}
            <span className="interval-timer-round">{fill(copy.interval.round, { round: phase.round, rounds: phase.rounds })}</span>
            {/* Continuous: drawn every frame from the stored end time, not from the tick. */}
            <CountdownBar
              className="interval-timer-progress"
              endsAt={run.endsAt}
              pausedRemainingMs={run.pausedMs}
              durationMs={durationMs}
              direction="fill"
            />
            <span className="interval-timer-next">
              {copy.interval.next} {describeNext(run, copy, language)}
            </span>
          </div>

          <div className="interval-timer-controls">
            <button type="button" className="interval-timer-control" onClick={isPaused ? onResume : onPause}>
              {isPaused ? `▶ ${copy.interval.resume}` : `❚❚ ${copy.interval.pause}`}
            </button>
            <button type="button" className="interval-timer-control" onClick={onSkip}>
              ⏭ {copy.interval.skip}
            </button>
          </div>
        </>
      )}

      <Modal isOpen={confirmStop} onClose={() => setConfirmStop(false)} variant="flat" title={copy.interval.confirmStopTitle}>
        <div className="interval-timer-dialog">
          <p className="interval-timer-dialog-text">{onAgain ? copy.interval.confirmStopFree : copy.interval.confirmStop}</p>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmStop(false);
              onClose();
            }}
          >
            {copy.interval.stopConfirm}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmStop(false)}>
            {copy.interval.keepGoing}
          </Button>
        </div>
      </Modal>

      {/* Closing the sheet without choosing counts as "No": nothing is logged for her. */}
      <Modal isOpen={catchUpCount > 0} onClose={() => onAnswerCatchUp(false)} variant="flat" title={copy.interval.catchUpTitle}>
        <div className="interval-timer-dialog">
          <p className="interval-timer-dialog-text">{plural(copy.interval.catchUp, catchUpCount)}</p>
          <Button onClick={() => onAnswerCatchUp(true)}>{copy.interval.catchUpYes}</Button>
          <Button variant="ghost" onClick={() => onAnswerCatchUp(false)}>
            {copy.interval.catchUpNo}
          </Button>
        </div>
      </Modal>
    </div>,
    document.body,
  );
}
