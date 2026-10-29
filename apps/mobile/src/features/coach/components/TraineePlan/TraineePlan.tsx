import { useCallback, useState } from 'react';
import type { CoachPlan, CoachTraineeDetail, PlanIssue } from '@sistem/types';
import { PlanRequestError } from '@sistem/api-client';
import { addDaysToDate, describeIssue, fill, formatWeekRange, sharedCopy, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { IconInfoCircle } from '@tabler/icons-react';
import { createPlan, listPlans, publishPlan } from '../../../../services/coach/coachService';
import { Button } from '../../../../components/common/Button/Button';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ConfirmSheet } from '../ConfirmSheet/ConfirmSheet';
import { SendNoteFields } from '../SendNoteFields/SendNoteFields';
import { useWorkoutSendNote } from '../../hooks/useWorkoutSendNote';
import { PlanCard } from '../PlanCard/PlanCard';
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
  // Both actions publish, so both sheets carry the message + tip that go out with it.
  const sendNote = useWorkoutSendNote();

  if (isLoading && !plans) return <StateMessage>{shared.common.loading}</StateMessage>;
  if (!plans) return <StateMessage onRetry={reload}>{error}</StateMessage>;

  // Weeks are Sundays in the trainee's time zone; the server sends the current one.
  const weeks = [
    { label: shared.weekRelation.this, start: trainee.currentWeekStart },
    { label: shared.weekRelation.next, start: addDaysToDate(trainee.currentWeekStart, 7) },
  ];
  const planFor = (week: string) => plans.find((plan) => plan.weekStartDate === week);
  // "Duplicate last week" fills the first of the two weeks that has no plan, from
  // the most recent earlier plan (the server picks it).
  const duplicateWeek = weeks.find((week) => !planFor(week.start))?.start;
  const canDuplicate = duplicateWeek !== undefined && plans.some((plan) => plan.weekStartDate < duplicateWeek);

  function ask(action: PendingAction) {
    sendNote.reset();
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
      if (pending.kind === 'duplicate') {
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
              <PlanCard plan={plan}>
                {plan.status === 'draft' && (
                  <Button className="trainee-plan-action" onClick={() => ask({ kind: 'publish', plan })}>
                    {copy.publishPlan}
                  </Button>
                )}
              </PlanCard>
            ) : (
              <>
                <p className="trainee-plan-none">{copy.noPlanThisWeek}</p>
                {canDuplicate && week.start === duplicateWeek && (
                  <Button
                    className="trainee-plan-action"
                    onClick={() => ask({ kind: 'duplicate', week: week.start })}
                  >
                    {copy.duplicateLastWeek}
                  </Button>
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
        title={pending?.kind === 'duplicate' ? copy.confirmDuplicateTitle : copy.confirmPublishTitle}
        message={
          pending?.kind === 'duplicate'
            ? fill(copy.confirmDuplicateMessage, { name: trainee.name, week: pendingWeek })
            : fill(copy.confirmPublishMessage, { name: trainee.name, week: pendingWeek })
        }
        confirmLabel={pending?.kind === 'duplicate' ? copy.duplicateConfirm : copy.publishConfirm}
        isWorking={isWorking}
        onConfirm={handleConfirm}
        onCancel={() => setPending(undefined)}
      >
        <SendNoteFields note={sendNote} />
      </ConfirmSheet>
    </div>
  );
}
