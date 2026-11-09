import type { CoachPlan } from '@sistem/types';
import { fill, formatWeekSpan, formatWeekSpanWithDays, sharedCopy, useCopy, useLanguage, weekRelationLabel } from '@sistem/shared';
import { ActionMenu } from '../../../../components/common/ActionMenu/ActionMenu';
import type { ActionMenuItem } from '../../../../components/common/ActionMenu/ActionMenu';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Tag } from '../../../../components/common/Tag/Tag';
import type { SaveStatus } from '../../hooks/usePlanEditor';
import { planBuilderCopy } from '../../copy';
import { StatusPill } from '../StatusPill/StatusPill';
import { TraineePicker } from '../TraineePicker/TraineePicker';
import './BuilderHeader.css';

interface BuilderHeaderProps {
  traineeId: string;
  traineeName: string;
  /** The trainee's current week, from the server — names this plan "This week" / "Next week". */
  currentWeekStart: string;
  plan: CoachPlan;
  saveStatus: SaveStatus;
  isDirty: boolean;
  /** A publish / unpublish / delete is on its way. */
  isBusy: boolean;
  /** Everything that is not the one primary action (the "⋯" menu). */
  menuItems: ActionMenuItem[];
  onSave: () => void;
  onPublish: () => void;
  /** A multi-week plan: "שבוע 2 מתוך 4" next to the status, and its own publish label. */
  blockLabel?: string;
  publishLabel?: string;
}

/**
 * The builder's top line: whose plan, which week and its status — and two controls only: the
 * "⋯" menu and ONE primary pill (publish a draft; save the changes of a published plan, which
 * is live for the trainee and therefore never autosaved).
 */
export function BuilderHeader({ traineeId, traineeName, currentWeekStart, plan, saveStatus, isDirty, isBusy, menuItems, onSave, onPublish, blockLabel, publishLabel }: BuilderHeaderProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(planBuilderCopy);
  const isPublished = plan.status === 'published';
  // "This week" / "Next week" when the plan is one of them; any other week is named by its dates.
  const title = weekRelationLabel(plan.weekStartDate, currentWeekStart, language) ?? formatWeekSpan(plan.weekStartDate, language);

  return (
    <header className="builder-header">
      <TraineePicker traineeId={traineeId} traineeName={traineeName} />

      <div className="builder-heading">
        <h1 className="builder-title">{title}</h1>
        <p className="builder-subline">
          <span className="builder-dates">{formatWeekSpanWithDays(plan.weekStartDate, language)}</span>
          {blockLabel && <Tag>{blockLabel}</Tag>}
          <StatusPill planStatus={plan.status} saveStatus={saveStatus} />
          {plan.locked && <Tag>{shared.coach.startedByTrainee}</Tag>}
        </p>
      </div>

      <div className="builder-actions">
        <ActionMenu label={copy.moreActions} items={menuItems} />
        {isPublished ? (
          <PillButton variant="primary" disabled={!isDirty || isBusy || saveStatus === 'saving'} onClick={onSave}>
            {copy.saveChanges}
          </PillButton>
        ) : (
          <PillButton variant="primary" disabled={isBusy} onClick={onPublish}>
            {publishLabel ?? fill(copy.publishTo, { name: traineeName })}
          </PillButton>
        )}
      </div>
    </header>
  );
}
