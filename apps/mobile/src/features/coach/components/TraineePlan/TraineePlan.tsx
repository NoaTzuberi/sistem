import { useCallback, useState } from 'react';
import type { CoachPlan, CoachTraineeDetail, PlanIssue } from '@sistem/types';
import { PlanRequestError } from '@sistem/api-client';
import { addDaysToDate, describeIssue, fill, formatWeekRange, sharedCopy, useCopy, useI18n, useLanguage, useLoad } from '@sistem/shared';
import { IconCopy, IconInfoCircle, IconSend } from '@tabler/icons-react';
import { copyPlanForward, createPlan, listPlans, publishPlan } from '../../../../services/coach/coachService';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { SendNoteFields } from '../SendNoteFields/SendNoteFields';
import { useWorkoutSendNote } from '../../hooks/useWorkoutSendNote';
import { PlanCard } from '../PlanCard/PlanCard';
import { DEFAULT_BLOCK_WEEKS, PlanLengthChoice } from '../PlanLengthChoice/PlanLengthChoice';
import type { PlanLength } from '../PlanLengthChoice/PlanLengthChoice';
import { coachCopy } from '../../copy';
import './TraineePlan.css';

interface TraineePlanProps {
  trainee: CoachTraineeDetail;
  /** A plan was published — the trainee's status may have changed. */
  onPlansChanged: () => void;
  /** Changes after a light edit elsewhere: load the plans again. */
  refreshKey?: number;
}

/** The light action waiting for a "yes" in the confirm sheet. */
type PendingAction = { kind: 'publish'; plan: CoachPlan } | { kind: 'duplicate'; week: string };

interface ActionFailure {
  week: string;
  message: string;
  issues: PlanIssue[];
}

/**
 * This week's and next week's plan, read-only, with the two light actions of coach
 * mode (PRD §6): publish a ready draft, and duplicate last week and publish. Both
 * use the dashboard's plan calls; every plan rule stays on the server.
 */
export function TraineePlan({ trainee, onPlansChanged, refreshKey = 0 }: TraineePlanProps) {
  const copy = useCopy(coachCopy);
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  // refreshKey is a dependency on purpose: a new key loads the plans again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => listPlans(trainee.id), [trainee.id, refreshKey]);
  const { data: plans, error, isLoading, reload } = useLoad(load, copy.plansLoadError);
  const [pending, setPending] = useState<PendingAction>();
  const [isWorking, setIsWorking] = useState(false);
  const [failure, setFailure] = useState<ActionFailure>();
  // "תוכנית חדשה" starts with the length (owner, 2026-11-09): weekly, or a multi-week plan.
  const [length, setLength] = useState<PlanLength>('weekly');
  const [blockWeeks, setBlockWeeks] = useState(DEFAULT_BLOCK_WEEKS);
  const { plural } = useI18n();
  // Both actions publish, so both sheets carry the message + tip that go out with it.
  const sendNote = useWorkoutSendNote();

  if (isLoading && !plans) return <StateMessage>{shared.common.loading}</StateMessage>;
  if (!plans) return <StateMessage onRetry={reload}>{error}</StateMessage>;

  // Weeks are Sundays in the trainee's time zone; the server sends the current one.
  const weeks = [
    { label: shared.weekRelation.this, start: trainee.currentWeekStart },
    { label: shared.weekRelation.next, start: addDaysToDate(trainee.currentWeekStart, 7) },
  ];
  // The server's statuses for this week's workouts (done / missed / upcoming in her zone).
  const thisWeekStatuses = Object.fromEntries((trainee.thisWeek?.workouts ?? []).map((workout) => [workout.id, workout.status]));
  const planFor = (week: string) => plans.find((plan) => plan.weekStartDate === week);
  // "Duplicate last week" fills the first of the two weeks that has no plan, from
  // the most recent earlier plan (the server picks it).
  const duplicateWeek = weeks.find((week) => !planFor(week.start))?.start;
  const canDuplicate = duplicateWeek !== undefined && plans.some((plan) => plan.weekStartDate < duplicateWeek);

  function ask(action: PendingAction) {
    sendNote.reset();
    setLength('weekly');
    setBlockWeeks(DEFAULT_BLOCK_WEEKS);
    setPending(action);
  }

  async function handleConfirm() {
    if (!pending) return;
    const week = pending.kind === 'publish' ? pending.plan.weekStartDate : pending.week;
    let copyWasSaved = false;

    setIsWorking(true);
    setFailure(undefined);
    try {
      let planId: string;
      if (pending.kind === 'duplicate' && length === 'block') {
        // A multi-week plan: week 1 = her latest published plan, copied into the later weeks (with the
        // exercises' progression), then all weeks published together.
        const first = await createPlan(trainee.id, { weekStartDate: week, duplicatePrevious: true, lengthWeeks: blockWeeks });
        planId = first.id;
        copyWasSaved = true;
        await copyPlanForward(trainee.id, first.id);
      } else if (pending.kind === 'duplicate') {
        const duplicate = await createPlan(trainee.id, { weekStartDate: week, duplicatePrevious: true });
        planId = duplicate.id;
        copyWasSaved = true;
      } else {
        planId = pending.plan.id;
      }
      await publishPlan(trainee.id, planId, await sendNote.take());
    } catch (actionError) {
      const message = (actionError instanceof Error && actionError.message) || copy.publishError;
      setFailure({
        week,
        message: copyWasSaved ? fill(copy.copySavedNotPublished, { message }) : message,
        issues: actionError instanceof PlanRequestError ? actionError.issues : [],
      });
    } finally {
      setIsWorking(false);
      setPending(undefined);
      reload();
      onPlansChanged();
    }
  }

  const pendingWeek = pending ? formatWeekRange(pending.kind === 'publish' ? pending.plan.weekStartDate : pending.week, language) : '';

  return (
    <div className="trainee-plan">
      {error && <StateMessage onRetry={reload}>{error}</StateMessage>}

      {weeks.map((week) => {
        const plan = planFor(week.start);
        return (
          <section key={week.start} className="trainee-plan-week">
            <h2 className="trainee-plan-week-title">
              {week.label} <span className="trainee-plan-week-dates">· {formatWeekRange(week.start, language)}</span>
            </h2>

            {plan ? (
              <PlanCard plan={plan} statuses={week.start === trainee.currentWeekStart ? thisWeekStatuses : undefined}>
                {plan.status === 'draft' && (
                  <PillButton className="trainee-plan-action" onClick={() => ask({ kind: 'publish', plan })}>
                    {copy.publishPlan}
                  </PillButton>
                )}
              </PlanCard>
            ) : (
              <>
                <p className="trainee-plan-none">{copy.noPlanThisWeek}</p>
                {canDuplicate && week.start === duplicateWeek && (
                  <PillButton className="trainee-plan-action" onClick={() => ask({ kind: 'duplicate', week: week.start })}>
                    {copy.newPlan}
                  </PillButton>
                )}
              </>
            )}

            {failure?.week === week.start && (
              <div className="trainee-plan-failure" role="alert">
                <p className="trainee-plan-failure-message">{failure.message}</p>
                {failure.issues.length > 0 && (
                  <ul className="trainee-plan-issues">
                    {failure.issues.map((issue, index) => (
                      <li key={index}>{describeIssue(issue, language)}</li>
                    ))}
                  </ul>
                )}
                <p className="trainee-plan-failure-message">{copy.fixOnDashboard}</p>
              </div>
            )}
          </section>
        );
      })}

      <p className="trainee-plan-hint">
        <IconInfoCircle className="trainee-plan-hint-icon" size={20} aria-hidden="true" />
        {copy.plansOnDashboard}
      </p>

      <ConfirmSheet
        isOpen={pending !== undefined}
        icon={pending?.kind === 'duplicate' ? <IconCopy size={22} /> : <IconSend size={22} />}
        title={pending?.kind === 'duplicate' ? copy.newPlan : copy.confirmPublishTitle}
        // "תוכנית חדשה": the length comes first, so its message is drawn under it (children).
        message={pending?.kind === 'duplicate' ? undefined : fill(copy.confirmPublishMessage, { name: trainee.name, week: pendingWeek })}
        confirmLabel={
          pending?.kind !== 'duplicate'
            ? copy.publishConfirm
            : length === 'block'
              ? fill(copy.newPlanBlockConfirm, { weeks: plural(copy.length.weeks, blockWeeks) })
              : copy.duplicateConfirm
        }
        isWorking={isWorking}
        onConfirm={handleConfirm}
        onCancel={() => setPending(undefined)}
      >
        {pending?.kind === 'duplicate' && (
          <>
            <PlanLengthChoice length={length} weeks={blockWeeks} onLengthChange={setLength} onWeeksChange={setBlockWeeks} disabled={isWorking} />
            <p className="trainee-plan-sheet-message">
              {length === 'block'
                ? fill(copy.newPlanBlockMessage, { name: trainee.name, weeks: plural(copy.length.weeks, blockWeeks), week: pendingWeek })
                : fill(copy.confirmDuplicateMessage, { name: trainee.name, week: pendingWeek })}
            </p>
          </>
        )}
        <SendNoteFields note={sendNote} />
      </ConfirmSheet>
    </div>
  );
}
