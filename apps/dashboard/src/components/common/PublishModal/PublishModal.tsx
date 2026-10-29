import { useEffect, useId, useRef } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { fill, isolateAuto, useCopy } from '@sistem/shared';
import { appCopy } from '../../../copy';
import type { PublishFlow } from '../../../hooks/usePublishFlow';
import { initialsOf } from '../Avatar/initials';
import { Icon } from '../Icon/Icon';
import './PublishModal.css';

export interface PublishSummary {
  kind: 'plan' | 'nutrition';
  /** "Week 42 · 11–17 Oct" / "Nutrition plan · 1,620 kcal a day". */
  title: string;
  /** Small facts: counts, portions. */
  chips: { id: string; label: string }[];
  /** Workout plans: one chip per workout in its identity color (class from workoutColorClass). */
  workouts?: { id: string; name: string; colorClass: string }[];
}

interface PublishModalProps {
  flow: PublishFlow;
  traineeName: string;
  summary: PublishSummary;
  /** "To her profile": closes, then opens her profile on the relevant tab. */
  onOpenProfile: () => void;
  /** Extra fields on the confirm step, under the summary (the nutrition send sheet's message + tip). */
  children?: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled])';
/** The confetti: a fixed set of pieces (where each lands and how long it takes), in four brand colors. */
const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  x: ((index * 37) % 100) - 50,
  rise: 40 + ((index * 53) % 70),
  turn: (index % 2 === 0 ? 1 : -1) * (180 + ((index * 61) % 360)),
  duration: 1.6 + ((index * 7) % 8) / 10,
  delay: ((index * 13) % 6) / 100,
  tone: (index % 4) + 1,
}));

/**
 * Publishing a plan or a nutrition plan: "Publish to [name]?" with what she will get, then — once
 * the existing publish call succeeds — a short celebration. An alert dialog: focus starts on the
 * main button and stays inside; Esc, "not yet" and the scrim close it (not while publishing).
 */
export function PublishModal({ flow, traineeName, summary, onOpenProfile, children }: PublishModalProps) {
  const copy = useCopy(appCopy).publish;
  const titleId = useId();
  const textId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const { step } = flow;
  // Her name as typed (Hebrew or Latin) never reorders the sentence around it.
  const name = isolateAuto(traineeName);
  const isDone = step === 'done';
  const isPublishing = step === 'publishing';

  // The step's main button takes the focus (the publish button, then "great").
  useEffect(() => {
    if (!flow.isOpen) return;
    cardRef.current?.querySelector<HTMLElement>('[data-primary]')?.focus();
  }, [flow.isOpen, isDone]);

  useEffect(() => {
    if (!flow.isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') flow.close();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [flow]);

  if (!flow.isOpen) return null;

  // Tab stays inside the card.
  function keepFocusInside(event: ReactKeyboardEvent) {
    if (event.key !== 'Tab' || !cardRef.current) return;
    const focusable = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  let body: ReactNode;
  if (isDone) {
    body = (
      <>
        <div className="publish-success" aria-hidden="true">
          <span className="publish-success-ring" />
          <span className="publish-success-circle">
            <svg className="publish-success-check" viewBox="0 0 24 24">
              <path d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} />
            </svg>
          </span>
          <span className="publish-confetti">
            {CONFETTI.map((piece, index) => (
              // Computed values: each piece's path (a custom property per piece, no visual style).
              <span
                key={index}
                className="publish-confetti-piece"
                data-tone={piece.tone}
                style={
                  {
                    '--piece-x': `${piece.x * 3}px`,
                    '--piece-rise': `${piece.rise}px`,
                    '--piece-turn': `${piece.turn}deg`,
                    '--piece-duration': `${piece.duration}s`,
                    '--piece-delay': `${piece.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        </div>
        <span className="publish-pill">{copy.published}</span>
        <h2 className="publish-title" id={titleId}>
          {fill(summary.kind === 'plan' ? copy.doneTitlePlan : copy.doneTitleNutrition, { name })}
        </h2>
        <p className="publish-text" id={textId}>
          {copy.doneText}
        </p>
        <div className="publish-actions">
          <button className="publish-primary" type="button" data-primary="" onClick={flow.close}>
            {copy.great}
          </button>
          <button className="publish-secondary" type="button" onClick={onOpenProfile}>
            {fill(copy.toProfile, { name })}
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <span className="publish-avatar" aria-hidden="true">
          {initialsOf(traineeName)}
          <span className="publish-avatar-badge">
            <Icon name="send" size="sm" />
          </span>
        </span>
        <h2 className="publish-title" id={titleId}>
          {fill(copy.title, { name })}
        </h2>
        <p className="publish-text" id={textId}>
          {summary.kind === 'plan' ? copy.textPlan : copy.textNutrition}
        </p>
        <div className="publish-summary">
          <p className="publish-summary-title">
            <bdi>{summary.title}</bdi>
          </p>
          <ul className="publish-chips">
            {summary.chips.map((chip) => (
              <li key={chip.id} className="publish-chip">
                <bdi>{chip.label}</bdi>
              </li>
            ))}
            {summary.workouts?.map((workout) => (
              <li key={workout.id} className={`publish-chip publish-chip-workout ${workout.colorClass}`}>
                <span className="publish-chip-dot" aria-hidden="true" />
                <bdi dir="auto">{workout.name}</bdi>
              </li>
            ))}
          </ul>
        </div>
        {children}
        {step === 'failed' && (
          <p className="publish-error" role="alert">
            {copy.failed}
          </p>
        )}
        <div className="publish-actions">
          <button className="publish-primary" type="button" data-primary="" aria-disabled={isPublishing || undefined} data-busy={isPublishing || undefined} onClick={() => void flow.confirm()}>
            {isPublishing ? <span className="publish-spinner" aria-hidden="true" /> : <Icon name="send" size="sm" />}
            {isPublishing ? copy.publishing : copy.now}
          </button>
          <button className="publish-secondary" type="button" disabled={isPublishing} onClick={flow.close}>
            {copy.notYet}
          </button>
        </div>
      </>
    );
  }

  return createPortal(
    <div className="publish-scrim" onClick={(event) => event.target === event.currentTarget && flow.close()}>
      <div
        ref={cardRef}
        className="publish-card"
        data-step={isDone ? 'done' : 'confirm'}
        data-wide={(children !== undefined && !isDone) || undefined}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        aria-busy={isPublishing || undefined}
        onKeyDown={keepFocusInside}
      >
        {body}
      </div>
    </div>,
    document.body,
  );
}
