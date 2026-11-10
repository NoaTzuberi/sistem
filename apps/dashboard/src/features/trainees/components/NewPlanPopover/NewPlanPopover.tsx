import { useEffect, useId, useRef } from 'react';
import { fill, formatWeekSpan, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog/ConfirmDialog';
import { DuplicateSources } from '../DuplicateSources/DuplicateSources';
import { PlanLengthPicker } from '../PlanLengthPicker/PlanLengthPicker';
import { NewPlanWeekCard } from '../NewPlanWeekCard/NewPlanWeekCard';
import { NewPlanFooter } from '../NewPlanFooter/NewPlanFooter';
import { aiDraftCopy } from '../../../aiDraft/copy';
import type { NewPlanPopoverState, PlanStartMethod } from '../../hooks/useNewPlanPopover';
import { listWeekSpans, useNewPlanFooter } from '../../hooks/useNewPlanFooter';
import { useRadioGroupKeys } from '../../hooks/useRadioGroupKeys';
import { traineesCopy } from '../../copy';
import './NewPlanPopover.css';

interface NewPlanPopoverProps {
  popover: NewPlanPopoverState;
  traineeId: string;
  /** How many workouts the AI draft that would be loaded has; undefined = there is no ready draft. */
  aiWorkoutCount: number | undefined;
  /** "Other split options": the AI draft sheet (split cards, regenerate). */
  onOpenAiOptions: () => void;
}

/**
 * "New plan": for which week, and how to start. A popover under the Plans toolbar — it grows
 * from its corner, closes on Esc / a press outside / ✕, and gives the focus back to what opened
 * it. A week with a draft opens it, or starts over after a question; a published week only opens
 * (useNewPlanFooter). A draft week's ⋯ deletes it.
 */
export function NewPlanPopover({ popover, traineeId, aiWorkoutCount, onOpenAiOptions }: NewPlanPopoverProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const ai = useCopy(aiDraftCopy);
  const handleRadioKeys = useRadioGroupKeys();
  const panelRef = useRef<HTMLDivElement>(null);
  const weeksRef = useRef<HTMLDivElement>(null);
  const footer = useNewPlanFooter(popover);
  const titleId = useId();
  const { isOpen, close, week, weeks, method } = popover;
  const hasWeeks = weeks.length > 0;
  const d = copy.duplicate;
  const f = copy.newPlanFooter;
  // While a question is up (replace the draft / delete it), Esc / a press belong to it, not to the popover.
  const isAsking = popover.draftConflict !== null || popover.deleteTarget !== null;
  const { weeksFocusRequest } = popover;
  const lastQuestion = useRef(popover.draftConflict);
  if (popover.draftConflict) lastQuestion.current = popover.draftConflict;

  // The focus returns to whatever opened it.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  // Esc and a press outside close it — not while the draft question is up (those belong to it).
  useEffect(() => {
    if (!isOpen || isAsking) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen, isAsking, close]);

  // Once the weeks are in, the selected week takes the focus.
  useEffect(() => {
    if (isOpen && hasWeeks) panelRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
  }, [isOpen, hasWeeks]);

  // "בחירת שבוע התחלה אחר": the week cards come into view, take the focus and light up once.
  useEffect(() => {
    if (weeksFocusRequest === 0) return;
    const cards = weeksRef.current;
    if (!cards) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cards.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    cards.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
    cards.classList.remove('new-plan-weeks-marked');
    void cards.offsetWidth; // restarts the mark when asked again
    cards.classList.add('new-plan-weeks-marked');
  }, [weeksFocusRequest]);

  if (!isOpen) return null;

  const { methodsDisabled } = footer;
  const isDuplicating = method === 'duplicate' && !methodsDisabled;
  const conflict = popover.draftConflict;
  // The question keeps its words while it fades out.
  const question = conflict ?? lastQuestion.current;
  const sources = popover.sources ?? [];
  const methods: { id: PlanStartMethod; label: string; hint: string; disabled: boolean }[] = [
    { id: 'scratch', label: copy.startScratch, hint: copy.fromScratchHint, disabled: false },
    {
      id: 'duplicate',
      label: copy.duplicateLastWeek,
      hint: popover.source ? fill(copy.copiesFrom, { week: formatWeekSpan(popover.source.weekStartDate, language) }) : copy.nothingToCopy,
      // Never disabled: with nothing published it shows the empty state (with the way forward).
      disabled: false,
    },
    {
      id: 'ai',
      label: ai.training.title,
      hint: popover.canUseAi ? (aiWorkoutCount !== undefined ? fill(ai.training.workoutCount, { count: aiWorkoutCount }) : ai.status.ready) : ai.training.none,
      disabled: !popover.canUseAi,
    },
  ];

  return (
    <div className="new-plan" ref={panelRef} role="dialog" aria-labelledby={titleId}>
      <header className="new-plan-head">
        <div>
          <h2 className="new-plan-title" id={titleId}>
            {copy.newPlan}
          </h2>
          <p className="new-plan-subtitle">{copy.newPlanSubtitle}</p>
        </div>
        <button className="new-plan-close" type="button" aria-label={shared.common.close} onClick={close}>
          <Icon name="close" size="sm" />
        </button>
      </header>

      {/* The first choice: weekly or a multi-week plan (owner, 2026-11-09). */}
      <PlanLengthPicker
        length={popover.length}
        weeks={popover.blockWeeks}
        onLengthChange={popover.selectLength}
        onWeeksChange={popover.selectBlockWeeks}
        disabled={popover.isCreating}
      />

      {popover.isLoading && <p className="new-plan-loading">{shared.common.loading}</p>}

      {hasWeeks && popover.currentWeekStart && (
        <>
          <p className="new-plan-label" id={`${titleId}-week`}>
            {copy.weekGroup}
          </p>
          <div
            className="new-plan-weeks"
            ref={weeksRef}
            role="radiogroup"
            aria-labelledby={`${titleId}-week`}
            onKeyDown={handleRadioKeys}
            onAnimationEnd={(event) => event.currentTarget.classList.remove('new-plan-weeks-marked')}
          >
            {weeks.map((entry) => (
              <NewPlanWeekCard
                key={entry.weekStartDate}
                entry={entry}
                currentWeekStart={popover.currentWeekStart!}
                isSelected={entry.weekStartDate === week?.weekStartDate}
                isInRange={footer.rangeWeeks.has(entry.weekStartDate)}
                onSelect={() => popover.selectWeek(entry.weekStartDate)}
                onDeleteDraft={(planId) => popover.askDelete(planId, entry.weekStartDate)}
              />
            ))}
          </div>

          <p className="new-plan-label" id={`${titleId}-how`}>
            {copy.howToStart}
          </p>
          <div className="new-plan-methods" role="radiogroup" aria-labelledby={`${titleId}-how`} onKeyDown={handleRadioKeys}>
            {methods.map((entry) => {
              const isSelected = !methodsDisabled && entry.id === method;
              return (
                <button
                  key={entry.id}
                  className="start-method"
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  // A week that only opens its plan (published, …): there is nothing to start.
                  disabled={methodsDisabled || entry.disabled}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => popover.selectMethod(entry.id)}
                >
                  <span className="start-method-label">{entry.label}</span>
                  <span className="start-method-hint">{entry.hint}</span>
                </button>
              );
            })}
          </div>

          {footer.showChoiceHint && <p className="new-plan-choice-hint">{f.choiceHint}</p>}

          {isDuplicating && (
            <DuplicateSources
              traineeId={traineeId}
              sources={sources}
              selectedId={popover.source?.id}
              onSelect={popover.selectSource}
              onBuildNew={() => void popover.confirm('scratch')}
              disabled={popover.isCreating}
            />
          )}

          <button className="new-plan-link" type="button" onClick={onOpenAiOptions}>
            {copy.otherSplits}
          </button>
        </>
      )}

      {popover.error && (
        <div className="new-plan-error" role="alert">
          <p className="new-plan-error-text">{popover.error}</p>
          <PillButton variant="soft" size="sm" disabled={popover.isCreating} onClick={popover.retry}>
            {d.retry}
          </PillButton>
        </div>
      )}

      <NewPlanFooter footer={footer} cancelLabel={shared.common.cancel} onCancel={close} busy={popover.isCreating} />

      {/* Start over instead of the draft (one week), or create over several weeks' drafts. */}
      <ConfirmDialog
        isOpen={conflict !== null}
        title={question?.planId ? d.draftTitle : f.draftsTitle}
        text={question?.planId ? f.draftText[question.method] : fill(f.draftsText, { weeks: listWeekSpans(question?.weeks ?? [], language) })}
        icon="clipboard"
        choices={
          question?.planId
            ? [
                { label: d.draftOpen, description: d.draftOpenHint, icon: 'pencil', onSelect: popover.openDraft },
                { label: d.draftReplace, description: f.replaceHint[question.method], icon: 'swap', tone: 'danger', onSelect: popover.replaceDraft },
              ]
            : [
                { label: f.draftsKeep, description: f.draftsKeepHint, icon: 'calendar', onSelect: popover.focusWeeks },
                { label: f.draftsReplace, description: f.draftsReplaceHint, icon: 'swap', tone: 'danger', onSelect: popover.replaceDraft },
              ]
        }
        cancelLabel={shared.common.cancel}
        onCancel={popover.cancelDraftConflict}
        busy={popover.isCreating}
      />

      <ConfirmDialog
        isOpen={popover.deleteTarget !== null}
        title={fill(copy.deleteDraft.title, { range: popover.deleteTarget ? formatWeekSpan(popover.deleteTarget.weekStartDate, language) : '' })}
        text={copy.deleteDraft.text}
        icon="trash"
        confirmLabel={copy.deleteDraft.action}
        confirmVariant="cherry"
        onConfirm={popover.confirmDelete}
        cancelLabel={shared.common.cancel}
        onCancel={popover.cancelDelete}
        busy={popover.isDeleting}
        error={popover.deleteError}
      />
    </div>
  );
}
