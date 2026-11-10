import { useId } from 'react';
import { IconChevronRight, IconExternalLink, IconX } from '@tabler/icons-react';
import type { NewPlanFlowState, PlanLength } from '@sistem/shared';
import { fill, formatPlural, formatWeekSpan, sharedCopy, useCopy, useI18n, useLanguage, weekRowLabel } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { openExternal } from '../../../../services/external/openExternal';
import { dashboardLinks } from '../../data/dashboardLinks';
import { PlanLengthChoice } from '../PlanLengthChoice/PlanLengthChoice';
import { NewPlanWeekRow } from '../NewPlanWeekRow/NewPlanWeekRow';
import { NewPlanWeekNotice } from '../NewPlanWeekNotice/NewPlanWeekNotice';
import { NewPlanStartOptions } from '../NewPlanStartOptions/NewPlanStartOptions';
import { coachCopy } from '../../copy';
import './NewPlanSheet.css';

/** What "שכפול ופרסום" hands to the publish sheet. */
export interface DuplicateRequest {
  weekStartDate: string;
  sourcePlanId: string;
  /** The source's week (+ another trainee's name), for the sheet's message. */
  sourceLabel: string;
  length: PlanLength;
  blockWeeks: number;
  /** Replaces the draft(s) in the range (asked in the publish sheet). */
  replaceDraft: boolean;
  /** The drafts' weeks, for the message. */
  replacedWeeks: string[];
}

interface NewPlanSheetProps {
  flow: NewPlanFlowState;
  traineeId: string;
  onDuplicate: (request: DuplicateRequest) => void;
}

/**
 * "תוכנית חדשה" in coach mode: the dashboard's two steps in a bottom sheet (1 · which week, 2 · how to start),
 * on the same shared rules (useNewPlanFlow). Duplicating goes on to the publish sheet; building from scratch,
 * the AI draft and opening a plan continue in the dashboard. "מחיקת הטיוטה" asks inside the sheet.
 */
export function NewPlanSheet({ flow, traineeId, onDuplicate }: NewPlanSheetProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const text = shared.newPlanFlow;
  const copy = useCopy(coachCopy);
  const { plural } = useI18n();
  const titleId = useId();
  const { step, situation, week, range, deleteTarget } = flow;
  const isBlock = flow.length === 'block';
  const inRange = new Set(range);
  const lastRow = [...flow.rows].reverse().find((row) => inRange.has(row.weekStartDate)) ?? flow.rows[flow.rows.length - 1];
  const noticeAfter = isBlock ? lastRow?.weekStartDate : week?.weekStartDate;
  const plansHref = dashboardLinks.traineePlans(traineeId);
  const openHref = situation.kind === 'draft' || situation.kind === 'published' ? dashboardLinks.plan(traineeId, situation.plan.id) : null;
  const showNext = situation.kind === 'create' || situation.kind === 'none' || situation.kind === 'blockTaken';
  const rangeChip = week
    ? isBlock
      ? formatPlural(language, text.rangeChip, flow.blockWeeks, { date: formatWeekSpan(week.weekStartDate, language) })
      : formatWeekSpan(week.weekStartDate, language)
    : '';

  function rowLabel(weekStartDate: string, relative: string): string {
    const index = isBlock ? range.indexOf(weekStartDate) : -1;
    if (index < 0) return relative;
    return index === 0 ? fill(text.rangeWeekWith, { n: 1, label: relative }) : fill(text.rangeWeek, { n: index + 1 });
  }

  function duplicate() {
    const { source } = flow;
    if (!week || !source) return;
    const sourceWeek = formatWeekSpan(source.weekStartDate, language);
    onDuplicate({
      weekStartDate: week.weekStartDate,
      sourcePlanId: source.id,
      sourceLabel: source.traineeId === traineeId ? sourceWeek : fill(copy.newPlanSources.of, { week: sourceWeek, name: source.traineeName }),
      length: flow.length,
      blockWeeks: flow.blockWeeks,
      replaceDraft: flow.isReplacing,
      replacedWeeks: situation.kind === 'blockDrafts' ? situation.weeks : flow.isReplacing ? [week.weekStartDate] : [],
    });
  }

  const cancel = (
    <button className="new-plan-quiet" type="button" onClick={flow.close}>
      {shared.common.cancel}
    </button>
  );

  let footer = cancel;
  if (deleteTarget) {
    footer = (
      <div className="new-plan-foot">
        <button className="new-plan-danger" type="button" disabled={flow.isDeleting} aria-busy={flow.isDeleting || undefined} onClick={flow.confirmDelete}>
          {text.deleteAction}
        </button>
        <button className="new-plan-quiet" type="button" disabled={flow.isDeleting} onClick={flow.cancelDelete}>
          {shared.common.cancel}
        </button>
      </div>
    );
  } else if (step === 1 && showNext) {
    footer = (
      <div className="new-plan-foot">
        <PillButton disabled={situation.kind !== 'create'} onClick={flow.next}>
          {text.next}
        </PillButton>
        {cancel}
      </div>
    );
  } else if (step === 2) {
    footer = (
      <div className="new-plan-foot">
        {flow.method === 'duplicate' ? (
          <PillButton disabled={!week || !flow.source} onClick={duplicate}>
            {isBlock ? fill(copy.newPlanBlockConfirm, { weeks: plural(copy.length.weeks, flow.blockWeeks) }) : copy.duplicateConfirm}
          </PillButton>
        ) : (
          plansHref && (
            <PillButton icon={<IconExternalLink size={18} aria-hidden="true" />} onClick={() => openExternal(plansHref)}>
              {copy.detail.openInDashboard}
            </PillButton>
          )
        )}
        {cancel}
      </div>
    );
  }

  return (
    <BottomSheet isOpen={flow.isOpen} onClose={flow.isDeleting ? () => undefined : flow.close} labelledBy={titleId} className="new-plan-sheet" footer={footer}>
      <div key={deleteTarget ? 'delete' : step} className={`new-plan-step new-plan-step-${deleteTarget ? 'forward' : flow.motion}`}>
        {deleteTarget ? (
          <>
            <h2 className="new-plan-title" id={titleId}>
              {fill(text.deleteTitle, { range: formatWeekSpan(deleteTarget.weekStartDate, language) })}
            </h2>
            <p className="new-plan-text">{text.deleteText}</p>
            {flow.deleteError && (
              <p className="new-plan-error" role="alert">
                {flow.deleteError}
              </p>
            )}
          </>
        ) : (
          <>
            <header className="new-plan-head">
              {step === 2 && (
                <button className="new-plan-round" type="button" aria-label={shared.common.back} onClick={flow.back}>
                  {/* Back points to the reading start: right in right-to-left as drawn, mirrored in left-to-right. */}
                  <IconChevronRight size={20} className="new-plan-back-icon" aria-hidden="true" />
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
              <button className="new-plan-round" type="button" aria-label={shared.common.close} onClick={flow.close}>
                <IconX size={18} stroke={2.2} aria-hidden="true" />
              </button>
            </header>

            {step === 1 && (
              <>
                <PlanLengthChoice length={flow.length} weeks={flow.blockWeeks} onLengthChange={flow.selectLength} onWeeksChange={flow.selectBlockWeeks} />
                {flow.isLoading && <p className="new-plan-text">{shared.common.loading}</p>}
                {flow.loadError && (
                  <div className="new-plan-error" role="alert">
                    <p>{flow.loadError}</p>
                    <PillButton variant="soft" onClick={flow.reloadLists}>
                      {shared.common.retry}
                    </PillButton>
                  </div>
                )}
                {flow.currentWeekStart && (
                  <div className="new-plan-rows" role="radiogroup" aria-labelledby={titleId}>
                    {flow.rows.map((entry) => (
                      <div key={entry.weekStartDate} className="new-plan-row-slot">
                        <NewPlanWeekRow
                          entry={entry}
                          label={rowLabel(entry.weekStartDate, weekRowLabel(entry, flow.currentWeekStart!, language))}
                          isSelected={entry.weekStartDate === week?.weekStartDate}
                          isInRange={isBlock && inRange.has(entry.weekStartDate)}
                          isBlocking={situation.kind === 'blockTaken' && situation.weekStartDate === entry.weekStartDate}
                          onSelect={() => flow.selectWeek(entry.weekStartDate)}
                        />
                        {entry.weekStartDate === noticeAfter && (
                          <NewPlanWeekNotice
                            situation={situation}
                            allWeeks={flow.allWeeks}
                            openHref={openHref}
                            onOpen={openExternal}
                            onStartOver={flow.startOver}
                            onDelete={(planId) => flow.askDelete(planId, entry.weekStartDate)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 2 && <NewPlanStartOptions flow={flow} traineeId={traineeId} hasDashboard={plansHref !== null} labelledBy={titleId} />}
            {step === 2 && flow.method !== 'duplicate' && !plansHref && <p className="new-plan-text">{copy.plansOnDashboard}</p>}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
