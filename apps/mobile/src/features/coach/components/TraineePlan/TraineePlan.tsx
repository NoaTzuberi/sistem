import { useCallback, useState } from 'react';
import type { CoachPlan, CoachTraineeDetail, PlanIssue } from '@sistem/types';
import { PlanRequestError } from '@sistem/api-client';
import { addDaysToDate, describeIssue, fill, formatWeekRange, formatWeekSpan, sharedCopy, useCopy, useI18n, useLanguage, useLoad, useNewPlanFlow } from '@sistem/shared';
import { IconCopy, IconInfoCircle, IconPlus, IconSend } from '@tabler/icons-react';
import { copyPlanForward, createPlan, deletePlan, listPlanSources, listPlanWeeks, listPlans, publishPlan } from '../../../../services/coach/coachService';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { SendNoteFields } from '../SendNoteFields/SendNoteFields';
import { useWorkoutSendNote } from '../../hooks/useWorkoutSendNote';
import { PlanCard } from '../PlanCard/PlanCard';
import { NewPlanSheet } from '../NewPlanSheet/NewPlanSheet';
import type { DuplicateRequest } from '../NewPlanSheet/NewPlanSheet';
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
type PendingAction = { kind: 'publish'; plan: CoachPlan } | { kind: 'duplicate'; request: DuplicateRequest };

const FLOW_API = { listPlanWeeks, listPlanSources, deletePlan };

interface ActionFailure {
  week: string;
  message: string;
  issues: PlanIssue[];
}

/**
 * This week's and next week's plan, read-only, with the two light actions of coach
 * mode (PRD §6): publish a ready draft, and "תוכנית חדשה" — the dashboard's two steps (NewPlanSheet, 2026-11-10)
 * whose duplicate copies and publishes here. Every plan rule stays on the server.
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
  const { plural } = useI18n();
  const flow = useNewPlanFlow(trainee.id, FLOW_API, () => {
    reload();
    onPlansChanged();
  });
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

  function ask(action: PendingAction) {
    sendNote.reset();
    setPending(action);
  }

  function duplicateFromFlow(request: DuplicateRequest) {
    flow.close();
    ask({ kind: 'duplicate', request });
  }

  async function handleConfirm() {
    if (!pending) return;
    const week = pending.kind === 'publish' ? pending.plan.weekStartDate : pending.request.weekStartDate;
    let copyWasSaved = false;

    setIsWorking(true);
    setFailure(undefined);
    try {
      let planId: string;
      if (pending.kind === 'duplicate') {
        const { request } = pending;
        const isBlock = request.length === 'block';
        const first = await createPlan(trainee.id, {
          weekStartDate: week,
          sourcePlanId: request.sourcePlanId,
          ...(request.replaceDraft ? { replaceDraft: true } : {}),
          ...(isBlock ? { lengthWeeks: request.blockWeeks } : {}),
        });
        planId = first.id;
        copyWasSaved = true;
        // A multi-week plan: week 1 = the copy, copied into the later weeks (with the exercises' progression),
        // then all weeks published together.
        if (isBlock) await copyPlanForward(trainee.id, first.id);
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

  const pendingWeek = pending ? formatWeekRange(pending.kind === 'publish' ? pending.plan.weekStartDate : pending.request.weekStartDate, language) : '';
  const request = pending?.kind === 'duplicate' ? pending.request : undefined;
  const flowText = shared.newPlanFlow;
  const replaceLine = !request?.replaceDraft
    ? ''
    : request.replacedWeeks.length > 1
      ? fill(flowText.replaceDraftsText, {
          weeks: new Intl.ListFormat(language, { type: 'conjunction' }).format(request.replacedWeeks.map((date) => formatWeekSpan(date, language))),
        })
      : flowText.replaceText.duplicate;
  const shownWeeks = new Set(weeks.map((week) => week.start));

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

      {/* A failed copy for a later week (the two shown weeks show theirs under them). */}
      {failure && !shownWeeks.has(failure.week) && (
        <div className="trainee-plan-failure" role="alert">
          <p className="trainee-plan-failure-message">{failure.message}</p>
          <p className="trainee-plan-failure-message">{copy.fixOnDashboard}</p>
        </div>
      )}

      <PillButton className="trainee-plan-action" icon={<IconPlus size={18} stroke={2.4} aria-hidden="true" />} onClick={() => void flow.open({ method: 'duplicate' })}>
        {copy.newPlan}
      </PillButton>

      <p className="trainee-plan-hint">
        <IconInfoCircle className="trainee-plan-hint-icon" size={20} aria-hidden="true" />
        {copy.plansOnDashboard}
      </p>

      <NewPlanSheet flow={flow} traineeId={trainee.id} onDuplicate={duplicateFromFlow} />

      <ConfirmSheet
        isOpen={pending !== undefined}
        icon={pending?.kind === 'duplicate' ? <IconCopy size={22} /> : <IconSend size={22} />}
        title={pending?.kind === 'duplicate' ? copy.newPlan : copy.confirmPublishTitle}
        message={
          !request
            ? fill(copy.confirmPublishMessage, { name: trainee.name, week: pendingWeek })
            : request.length === 'block'
              ? fill(copy.newPlanBlockMessage, { source: request.sourceLabel, name: trainee.name, weeks: plural(copy.length.weeks, request.blockWeeks), week: pendingWeek })
              : fill(copy.confirmDuplicateMessage, { source: request.sourceLabel, name: trainee.name, week: pendingWeek })
        }
        confirmLabel={
          !request
            ? copy.publishConfirm
            : request.length === 'block'
              ? fill(copy.newPlanBlockConfirm, { weeks: plural(copy.length.weeks, request.blockWeeks) })
              : copy.duplicateConfirm
        }
        tone={request?.replaceDraft ? 'destructive' : 'default'}
        isWorking={isWorking}
        onConfirm={handleConfirm}
        onCancel={() => setPending(undefined)}
      >
        {/* Over draft(s): what is replaced, said once more before it happens. */}
        {replaceLine && <p className="trainee-plan-sheet-message">{replaceLine}</p>}
        <SendNoteFields note={sendNote} />
      </ConfirmSheet>
    </div>
  );
}
