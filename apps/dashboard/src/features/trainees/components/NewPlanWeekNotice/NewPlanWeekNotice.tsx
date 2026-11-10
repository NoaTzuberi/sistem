import type { PlanWeekOption } from '@sistem/types';
import type { NewPlanSituation } from '@sistem/shared';
import { canDeleteDraft, fill, formatEditedDay, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import './NewPlanWeekNotice.css';

interface NewPlanWeekNoticeProps {
  situation: NewPlanSituation;
  /** Every week the server offered (the workout counts of a range's drafts). */
  allWeeks: PlanWeekOption[];
  onOpen: () => void;
  onStartOver: () => void;
  onDelete: (planId: string) => void;
  busy: boolean;
}

/**
 * The card under the chosen week (step 1) when it already holds something: a draft (purple — continue it, start
 * over, delete it), a published plan (Cherry — open it), the drafts in a multi-week range, or the week that blocks
 * it. Nothing for a free week.
 */
export function NewPlanWeekNotice({ situation, allWeeks, onOpen, onStartOver, onDelete, busy }: NewPlanWeekNoticeProps) {
  const language = useLanguage();
  const text = useCopy(sharedCopy).newPlanFlow;
  const workouts = (count: number) => formatPlural(language, text.workouts, count);

  switch (situation.kind) {
    case 'none':
    case 'create':
      return null;
    case 'draft': {
      const { plan } = situation;
      const edited = formatEditedDay(plan.updatedAt, language);
      return (
        <div className="new-plan-notice new-plan-notice-draft" role="status">
          <p className="new-plan-notice-title">{formatPlural(language, text.draftTitle, plan.workoutCount)}</p>
          <p className="new-plan-notice-meta">{situation.canReplace ? fill(text.draftEdited, { date: edited }) : text.fixedDraft}</p>
          <div className="new-plan-notice-actions">
            <PillButton variant="primary" disabled={busy} onClick={onOpen}>
              {text.continueDraft}
            </PillButton>
            {situation.canReplace && (
              <PillButton variant="soft" className="new-plan-notice-soft" disabled={busy} onClick={onStartOver}>
                {text.startOver}
              </PillButton>
            )}
          </div>
          {canDeleteDraft(plan) && (
            <button className="new-plan-notice-link" type="button" disabled={busy} onClick={() => onDelete(plan.id)}>
              {text.deleteAction}
            </button>
          )}
        </div>
      );
    }
    case 'published':
      return (
        <div className="new-plan-notice new-plan-notice-live" role="status">
          <p className="new-plan-notice-title">{text.publishedTitle}</p>
          <p className="new-plan-notice-meta">{text.publishedText}</p>
          <div className="new-plan-notice-actions">
            <PillButton variant="primary" disabled={busy} onClick={onOpen}>
              {text.openPlan}
            </PillButton>
          </div>
        </div>
      );
    case 'blockDrafts': {
      const countOf = (week: string) => allWeeks.find((entry) => entry.weekStartDate === week)?.plan?.workoutCount ?? 0;
      return (
        <div className="new-plan-notice new-plan-notice-draft" role="status">
          <p className="new-plan-notice-title">{formatPlural(language, text.blockDraftsTitle, situation.weeks.length)}</p>
          <ul className="new-plan-notice-list">
            {situation.weeks.map((week) => (
              <li key={week}>{fill(text.blockDraftLine, { week: formatWeekSpan(week, language), workouts: workouts(countOf(week)) })}</li>
            ))}
          </ul>
          <div className="new-plan-notice-actions">
            <PillButton variant="soft" className="new-plan-notice-soft" disabled={busy} onClick={onStartOver}>
              {formatPlural(language, text.replaceDrafts, situation.weeks.length)}
            </PillButton>
          </div>
        </div>
      );
    }
    case 'blockTaken':
      return (
        <div className="new-plan-notice new-plan-notice-live" role="status">
          <p className="new-plan-notice-title">
            {fill(situation.isPublished ? text.blockPublished : text.blockTaken, { week: formatWeekSpan(situation.weekStartDate, language) })}
          </p>
          <p className="new-plan-notice-meta">{text.blockHint}</p>
        </div>
      );
  }
}
