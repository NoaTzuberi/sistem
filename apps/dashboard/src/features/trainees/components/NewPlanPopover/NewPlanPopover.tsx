import { useEffect, useId, useRef } from 'react';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage, weekRowLabel } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog/ConfirmDialog';
import { PlanLengthPicker } from '../PlanLengthPicker/PlanLengthPicker';
import { NewPlanWeekRow } from '../NewPlanWeekRow/NewPlanWeekRow';
import { NewPlanWeekNotice } from '../NewPlanWeekNotice/NewPlanWeekNotice';
import { NewPlanStartOptions } from '../NewPlanStartOptions/NewPlanStartOptions';
import type { NewPlanPopoverState } from '../../hooks/useNewPlanPopover';
import { useRadioGroupKeys } from '../../hooks/useRadioGroupKeys';
import { traineesCopy } from '../../copy';
import './NewPlanPopover.css';

interface NewPlanPopoverProps {
  popover: NewPlanPopoverState;
  traineeId: string;
  /** How many workouts the AI draft that would be loaded has; undefined = there is no ready draft. */
  aiWorkoutCount: number | undefined;
  /** "חלוקת אימונים": the AI draft sheet (split cards, regenerate). */
  onOpenAiOptions: () => void;
}

/**
 * "תוכנית חדשה" in two steps (approved preview, 2026-11-10): 1 · which week (the length, then the weeks with
 * what is already there — a draft or a published plan opens its card under the row), 2 · how to start. A
 * popover under the Plans toolbar: it grows from its corner, closes on Esc / a press outside / ✕, and gives
 * the focus back to what opened it. The steps slide in from the reading side (a fade under reduced motion).
 */
export function NewPlanPopover({ popover, traineeId, aiWorkoutCount, onOpenAiOptions }: NewPlanPopoverProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const text = shared.newPlanFlow;
  const retryLabel = useCopy(traineesCopy).duplicate.retry;
  const handleRadioKeys = useRadioGroupKeys();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { isOpen, close, step, situation, week, range } = popover;
  const hasWeeks = popover.rows.length > 0 && popover.currentWeekStart !== undefined;
  // While a question is up (replace the draft / delete it), Esc / a press belong to it, not to the popover.
  const isAsking = popover.question !== null || popover.deleteTarget !== null;
  const lastQuestion = useRef(popover.question);
  if (popover.question) lastQuestion.current = popover.question;

  // The focus returns to whatever opened it.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  // Esc and a press outside close it — not while a question is up.
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

  // Once the weeks are in, and on each step, the chosen radio takes the focus.
  useEffect(() => {
    if (!isOpen || !hasWeeks) return;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]:not(:disabled)') ?? panel?.querySelector<HTMLElement>('[role="radio"]:not(:disabled)'))?.focus();
  }, [isOpen, hasWeeks, step]);

  if (!isOpen) return null;

  const question = popover.question ?? lastQuestion.current;
  const isBlock = popover.length === 'block';
  const inRange = new Set(range);
  const lastRow = [...popover.rows].reverse().find((row) => inRange.has(row.weekStartDate)) ?? popover.rows[popover.rows.length - 1];
  // The card goes under the chosen week; for a multi-week plan, under the last week it covers.
  const noticeAfter = isBlock ? lastRow?.weekStartDate : week?.weekStartDate;
  const replaceCount = situation.kind === 'blockDrafts' ? situation.weeks.length : 1;
  const createLabel = popover.isReplacing
    ? formatPlural(language, text.createReplace, replaceCount)
    : isBlock
      ? formatPlural(language, text.createBlock, popover.blockWeeks)
      : text.create;
  const rangeChip = week
    ? isBlock
      ? formatPlural(language, text.rangeChip, popover.blockWeeks, { date: formatWeekSpan(week.weekStartDate, language) })
      : formatWeekSpan(week.weekStartDate, language)
    : '';
  const listWeeks = (weeks: string[]) => new Intl.ListFormat(language, { type: 'conjunction' }).format(weeks.map((date) => formatWeekSpan(date, language)));
  // Step 1's own pink pill only when every week is free; a taken week acts from its card.
  const showNext = situation.kind === 'create' || situation.kind === 'none' || situation.kind === 'blockTaken';

  function rowLabel(weekStartDate: string, relative: string): string {
    const index = isBlock ? range.indexOf(weekStartDate) : -1;
    if (index < 0) return relative;
    return index === 0 ? fill(text.rangeWeekWith, { n: 1, label: relative }) : fill(text.rangeWeek, { n: index + 1 });
  }

  return (
    <div className="new-plan" ref={panelRef} role="dialog" aria-labelledby={titleId}>
      <div key={step} className={`new-plan-step new-plan-step-${popover.motion}`}>
        <header className="new-plan-head">
          <div className="new-plan-head-start">
            {step === 2 && (
              <button className="new-plan-round new-plan-back" type="button" aria-label={shared.common.back} disabled={popover.isCreating} onClick={popover.back}>
                <Icon name="chevron" size="sm" className="new-plan-back-icon" />
              </button>
            )}
            <div className="new-plan-head-text">
              <p className="new-plan-step-of">{fill(text.stepOf, { n: step })}</p>
              <h2 className="new-plan-title" id={titleId}>
                {step === 1 ? text.whichWeek : text.howToStart}
              </h2>
              {step === 2 && rangeChip && (
                <span className="new-plan-range">
                  <bdi>{rangeChip}</bdi>
                </span>
              )}
            </div>
          </div>
          <button className="new-plan-round" type="button" aria-label={shared.common.close} onClick={close}>
            <Icon name="close" size="sm" />
          </button>
        </header>

        {step === 1 && (
          <>
            <PlanLengthPicker
              length={popover.length}
              weeks={popover.blockWeeks}
              onLengthChange={popover.selectLength}
              onWeeksChange={popover.selectBlockWeeks}
              disabled={popover.isCreating}
            />

            {popover.isLoading && <p className="new-plan-loading">{shared.common.loading}</p>}

            {hasWeeks && (
              <div className="new-plan-rows" role="radiogroup" aria-labelledby={titleId} onKeyDown={handleRadioKeys}>
                {popover.rows.map((entry) => (
                  <div key={entry.weekStartDate} className="new-plan-row-slot">
                    <NewPlanWeekRow
                      entry={entry}
                      label={rowLabel(entry.weekStartDate, weekRowLabel(entry, popover.currentWeekStart!, language))}
                      isSelected={entry.weekStartDate === week?.weekStartDate}
                      isInRange={isBlock && inRange.has(entry.weekStartDate)}
                      isBlocking={situation.kind === 'blockTaken' && situation.weekStartDate === entry.weekStartDate}
                      onSelect={() => popover.selectWeek(entry.weekStartDate)}
                    />
                    {entry.weekStartDate === noticeAfter && (
                      <NewPlanWeekNotice
                        situation={situation}
                        allWeeks={popover.allWeeks}
                        onOpen={popover.openExisting}
                        onStartOver={popover.startOver}
                        onDelete={(planId) => popover.askDelete(planId, entry.weekStartDate)}
                        busy={popover.isCreating}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <NewPlanStartOptions popover={popover} traineeId={traineeId} aiWorkoutCount={aiWorkoutCount} onOpenSplits={onOpenAiOptions} labelledBy={titleId} />
        )}

        {popover.error && (
          <div className="new-plan-error" role="alert">
            <p className="new-plan-error-text">{popover.error}</p>
            <PillButton variant="soft" size="sm" disabled={popover.isCreating} onClick={popover.retry}>
              {retryLabel}
            </PillButton>
          </div>
        )}

        <div className="new-plan-foot">
          {step === 1 && showNext && (
            <PillButton variant="primary" className="new-plan-foot-primary" disabled={situation.kind !== 'create'} onClick={popover.next}>
              {text.next}
            </PillButton>
          )}
          {step === 2 && (
            <PillButton
              variant="primary"
              className="new-plan-foot-primary"
              disabled={!week || popover.isCreating || popover.needsSource}
              aria-busy={popover.isCreating || undefined}
              onClick={popover.confirm}
            >
              {createLabel}
            </PillButton>
          )}
          <button className="new-plan-quiet" type="button" disabled={popover.isCreating} onClick={close}>
            {shared.common.cancel}
          </button>
        </div>
      </div>

      {/* Creating over a week's draft, or over the drafts of a multi-week range: asked first. */}
      <ConfirmDialog
        isOpen={popover.question !== null}
        title={question?.isMany ? text.replaceDraftsTitle : text.replaceTitle}
        text={question?.isMany ? fill(text.replaceDraftsText, { weeks: listWeeks(question.weeks) }) : text.replaceText[popover.method]}
        icon="swap"
        confirmLabel={question?.isMany ? text.replaceDraftsConfirm : text.replaceConfirm}
        confirmVariant="cherry"
        onConfirm={popover.replace}
        cancelLabel={shared.common.cancel}
        onCancel={popover.cancelQuestion}
        busy={popover.isCreating}
      />

      <ConfirmDialog
        isOpen={popover.deleteTarget !== null}
        title={fill(text.deleteTitle, { range: popover.deleteTarget ? formatWeekSpan(popover.deleteTarget.weekStartDate, language) : '' })}
        text={text.deleteText}
        icon="trash"
        confirmLabel={text.deleteAction}
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
