import { useEffect, useId, useRef } from 'react';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog/ConfirmDialog';
import { DuplicateSources } from '../DuplicateSources/DuplicateSources';
import { PlanLengthPicker } from '../PlanLengthPicker/PlanLengthPicker';
import { aiDraftCopy } from '../../../aiDraft/copy';
import { weekTileLabel } from '../../data/planWeeks';
import type { NewPlanPopoverState, PlanStartMethod } from '../../hooks/useNewPlanPopover';
import { useRadioGroupKeys } from '../../hooks/useRadioGroupKeys';
import { startActionFor } from '../../data/newPlanStart';
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
 * it. A week that already has a plan cannot be started again: the button opens that plan.
 */
export function NewPlanPopover({ popover, traineeId, aiWorkoutCount, onOpenAiOptions }: NewPlanPopoverProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const ai = useCopy(aiDraftCopy);
  const handleRadioKeys = useRadioGroupKeys();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { isOpen, close, week, weeks, method } = popover;
  const hasWeeks = weeks.length > 0;
  const d = copy.duplicate;
  // While the draft question is up, Esc / a press belong to it, not to the popover.
  const isAsking = popover.draftConflict !== null;

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

  if (!isOpen) return null;

  // A week with a plan opens it — except a draft week when duplicating (she is asked replace / open).
  const isPublishedWeek = week?.plan?.status === 'published';
  const isBlock = popover.length === 'block';
  const action = startActionFor(week, method, popover.length);
  const isTaken = action === 'open';
  const isDuplicating = action === 'duplicate';
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
          <div className="new-plan-weeks" role="radiogroup" aria-labelledby={`${titleId}-week`} onKeyDown={handleRadioKeys}>
            {weeks.map((entry) => {
              const isSelected = entry.weekStartDate === week?.weekStartDate;
              return (
                <button
                  key={entry.weekStartDate}
                  className="week-tile"
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => popover.selectWeek(entry.weekStartDate)}
                >
                  <span className="week-tile-label">{weekTileLabel(entry, popover.currentWeekStart!, language)}</span>
                  <span className="week-tile-dates">{formatWeekSpan(entry.weekStartDate, language)}</span>
                  <span className={`week-tile-status week-tile-status-${entry.plan?.status ?? 'free'}`}>
                    {entry.plan ? shared.coach.planStatus[entry.plan.status] : copy.weekFree}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="new-plan-label" id={`${titleId}-how`}>
            {copy.howToStart}
          </p>
          <div className="new-plan-methods" role="radiogroup" aria-labelledby={`${titleId}-how`} onKeyDown={handleRadioKeys}>
            {methods.map((entry) => {
              const isSelected = !isPublishedWeek && entry.id === method;
              return (
                <button
                  key={entry.id}
                  className="start-method"
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  // A published week opens its plan: there is nothing to start.
                  disabled={isPublishedWeek || entry.disabled}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => popover.selectMethod(entry.id)}
                >
                  <span className="start-method-label">{entry.label}</span>
                  <span className="start-method-hint">{entry.hint}</span>
                </button>
              );
            })}
          </div>

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

      {isBlock && !isTaken && popover.blockTakenWeek !== null && (
        <p className="new-plan-note" role="status">
          {fill(copy.length.blockTakenNote, { n: popover.blockTakenWeek })}
        </p>
      )}
      {isTaken && week?.plan && (
        <p className="new-plan-note" role="status">
          {fill(copy.weekTakenNote, { status: shared.coach.planStatus[week.plan.status] })}
        </p>
      )}
      {popover.error && (
        <div className="new-plan-error" role="alert">
          <p className="new-plan-error-text">{popover.error}</p>
          <PillButton variant="soft" size="sm" disabled={popover.isCreating} onClick={popover.retry}>
            {d.retry}
          </PillButton>
        </div>
      )}

      <div className="new-plan-actions">
        <PillButton
          variant="primary"
          className="new-plan-confirm"
          disabled={!week || popover.isCreating || (isDuplicating && !popover.source) || (isBlock && !isTaken && popover.blockTakenWeek !== null)}
          onClick={() => void popover.confirm()}
        >
          {isTaken
            ? copy.openExisting
            : !week
              ? copy.newPlan
              : isBlock
                ? fill(copy.length.createBlockFor, {
                    weeks: formatPlural(language, copy.length.weeks, popover.blockWeeks),
                    range: formatWeekSpan(week.weekStartDate, language),
                  })
                : fill(isDuplicating ? d.confirm : copy.createFor, { range: formatWeekSpan(week.weekStartDate, language) })}
        </PillButton>
        <PillButton variant="fill" disabled={popover.isCreating} onClick={close}>
          {shared.common.cancel}
        </PillButton>
      </div>

      <ConfirmDialog
        isOpen={isAsking}
        title={d.draftTitle}
        text={d.draftText}
        confirmLabel={d.draftReplace}
        confirmVariant="cherry"
        altLabel={d.draftOpen}
        onAlt={popover.openDraft}
        cancelLabel={shared.common.cancel}
        onConfirm={popover.replaceDraft}
        onCancel={popover.cancelDraftConflict}
        busy={popover.isCreating}
      />
    </div>
  );
}
