import type { Language } from '@sistem/types';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { fill, formatDuration, useCopy, useI18n, isolateLtr } from '@sistem/shared';
import { IconClockCheck, IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipForwardFilled, IconPlayerStopFilled } from '@tabler/icons-react';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { useDocumentSurface } from '../../../../hooks/useDocumentSurface';
import { countRoundsDone, nextWork } from '../../data/intervalTimeline';
import { unlockAudio } from '../../data/intervalSounds';
import type { IntervalRun } from '../../data/intervalTimeline';
import { formatClock } from '../../data/workoutDisplay';
import { workoutCopy } from '../../copy';
import { CountdownRing } from '../CountdownRing/CountdownRing';
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
 * The interval run, full screen and hands-free (HIIT / Tabata): the phase, a big ring with the
 * countdown, the exercise, the round and what's next; stop / pause / skip as media buttons. Work (and
 * the done screen) = the pink stage, rest / get ready = ink — the browser edges follow the phase.
 * Portaled above the app so the page-enter animation can't move it.
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
  const onStage = showDone || phase.kind === 'work';
  useDocumentSurface(onStage ? 'stage' : 'interval-rest', onStage ? '--color-stage-full-top' : '--color-it-rest');

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
        <SoundToggle className="interval-timer-mute" />
      </div>

      {showDone ? (
        <div className="interval-timer-main">
          <span className="interval-timer-phase display-title">{copy.interval.doneTitle}</span>
          <span className="interval-timer-subtitle">
            {fill(copy.interval.roundsDone, { progress: isolateLtr(`${countRoundsDone(run)} / ${phase.rounds}`) })}
          </span>
          <div className="interval-timer-done-actions">
            <PillButton className="interval-timer-done-primary" onClick={onClose}>
              {doneLabel}
            </PillButton>
            {onAgain && (
              <PillButton variant="soft" className="interval-timer-done-again" onClick={onAgain}>
                {copy.interval.again}
              </PillButton>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="interval-timer-main" role="timer" aria-live="off">
            <span className="interval-timer-phase display-title">{copy.interval.phase[phase.kind]}</span>
            {/* Continuous: drawn every frame from the stored end time, not from the tick. */}
            <CountdownRing endsAt={run.endsAt} pausedRemainingMs={run.pausedMs} durationMs={durationMs}>
              <bdi className="interval-timer-clock" dir="ltr">
                {formatClock(Math.ceil(remainingMs / 1000))}
              </bdi>
              {isPaused && <span className="interval-timer-paused">{copy.interval.paused}</span>}
            </CountdownRing>
            {subtitle && <span className="interval-timer-subtitle">{subtitle}</span>}
            <span className="interval-timer-round">{fill(copy.interval.round, { round: phase.round, rounds: phase.rounds })}</span>
            <span className="interval-timer-next">
              {copy.interval.next} {describeNext(run, copy, language)}
            </span>
          </div>

          {/* Media controls read left → right in both languages (like a player): stop, pause, skip. */}
          <div className="interval-timer-controls">
            <button type="button" className="interval-timer-control" aria-label={copy.interval.stop} onClick={() => setConfirmStop(true)}>
              <span className="interval-timer-control-disc" aria-hidden="true">
                <IconPlayerStopFilled size={24} />
              </span>
              <span className="interval-timer-control-label" aria-hidden="true">
                {copy.interval.stopConfirm}
              </span>
            </button>
            <button type="button" className="interval-timer-control" onClick={isPaused ? onResume : onPause}>
              <span className="interval-timer-control-disc" aria-hidden="true">
                {isPaused ? <IconPlayerPlayFilled size={24} /> : <IconPlayerPauseFilled size={24} />}
              </span>
              <span className="interval-timer-control-label">{isPaused ? copy.interval.resume : copy.interval.pause}</span>
            </button>
            <button type="button" className="interval-timer-control" onClick={onSkip}>
              <span className="interval-timer-control-disc" aria-hidden="true">
                <IconPlayerSkipForwardFilled size={24} />
              </span>
              <span className="interval-timer-control-label">{copy.interval.skip}</span>
            </button>
          </div>
        </>
      )}

      <ConfirmSheet
        isOpen={confirmStop}
        tone="destructive"
        icon={<IconPlayerStopFilled size={22} />}
        title={copy.interval.confirmStopTitle}
        message={onAgain ? copy.interval.confirmStopFree : copy.interval.confirmStop}
        confirmLabel={copy.interval.stopConfirm}
        cancelLabel={copy.interval.keepGoing}
        onConfirm={() => {
          setConfirmStop(false);
          onClose();
        }}
        onCancel={() => setConfirmStop(false)}
      />

      {/* Closing the sheet without choosing counts as "No": nothing is logged for her. */}
      <ConfirmSheet
        isOpen={catchUpCount > 0}
        icon={<IconClockCheck size={22} />}
        title={copy.interval.catchUpTitle}
        message={plural(copy.interval.catchUp, catchUpCount)}
        confirmLabel={copy.interval.catchUpYes}
        cancelLabel={copy.interval.catchUpNo}
        onConfirm={() => onAnswerCatchUp(true)}
        onCancel={() => onAnswerCatchUp(false)}
      />
    </div>,
    document.body,
  );
}
