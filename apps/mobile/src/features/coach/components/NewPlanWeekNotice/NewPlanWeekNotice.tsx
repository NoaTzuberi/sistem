import { IconExternalLink } from '@tabler/icons-react';
import type { PlanWeekOption } from '@sistem/types';
import type { NewPlanSituation } from '@sistem/shared';
import { canDeleteDraft, fill, formatEditedDay, formatPlural, formatWeekSpan, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import './NewPlanWeekNotice.css';

interface NewPlanWeekNoticeProps {
  situation: NewPlanSituation;
  allWeeks: PlanWeekOption[];
  /** "להמשיך בטיוטה" / "פתיחת התוכנית": the plan in the dashboard's builder; null = no dashboard address (no button). */
  openHref: string | null;
  onOpen: (href: string) => void;
  onStartOver: () => void;
  onDelete: (planId: string) => void;
}

/**
 * The card under the chosen week (step 1) when it already holds something — the dashboard's card on the phone:
 * a draft (purple), a published plan (Cherry), the drafts in a multi-week range, or the week that blocks it.
 * Opening a plan happens in the dashboard (the builder lives there).
 */
export function NewPlanWeekNotice({ situation, allWeeks, openHref, onOpen, onStartOver, onDelete }: NewPlanWeekNoticeProps) {
  const language = useLanguage();
  const text = useCopy(sharedCopy).newPlanFlow;
  const workouts = (count: number) => formatPlural(language, text.workouts, count);
  const openButton = (label: string) =>
    openHref && (
      <PillButton icon={<IconExternalLink size={18} aria-hidden="true" />} onClick={() => onOpen(openHref)}>
        {label}
      </PillButton>
    );

  switch (situation.kind) {
    case 'none':
    case 'create':
      return null;
    case 'draft': {
      const { plan } = situation;
      return (
        <div className="new-plan-notice new-plan-notice-draft" role="status">
          <p className="new-plan-notice-title">{formatPlural(language, text.draftTitle, plan.workoutCount)}</p>
          <p className="new-plan-notice-meta">
            {situation.canReplace ? fill(text.draftEdited, { date: formatEditedDay(plan.updatedAt, language) }) : text.fixedDraft}
          </p>
          <div className="new-plan-notice-actions">
            {openButton(text.continueDraft)}
            {situation.canReplace && (
              <PillButton variant="soft" className="new-plan-notice-soft" onClick={onStartOver}>
                {text.startOver}
              </PillButton>
            )}
          </div>
          {canDeleteDraft(plan) && (
            <button className="new-plan-notice-link" type="button" onClick={() => onDelete(plan.id)}>
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
          {openHref && <div className="new-plan-notice-actions">{openButton(text.openPlan)}</div>}
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
            <PillButton variant="soft" className="new-plan-notice-soft" onClick={onStartOver}>
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
