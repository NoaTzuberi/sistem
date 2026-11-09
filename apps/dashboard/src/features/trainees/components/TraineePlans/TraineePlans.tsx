import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CoachTraineeDetail } from '@sistem/types';
import { addDaysToDate, fill, sharedCopy, useCopy } from '@sistem/shared';
import { planPath } from '../../../../app/config/routes';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { useCoachData } from '../../../../services/coach/CoachDataContext';
import { AiDraftSheet } from '../../../aiDraft/components/AiDraftSheet/AiDraftSheet';
import { AiPlanCard } from '../../../aiDraft/components/AiPlanCard/AiPlanCard';
import { useLatestAiDraft } from '../../../aiDraft/hooks/useLatestAiDraft';
import { useTrainingConfig } from '../../../trainingConfig/useTrainingConfig';
import { useNewPlanPopover } from '../../hooks/useNewPlanPopover';
import type { PlanStartMethod } from '../../hooks/useNewPlanPopover';
import { useSelectedWeek } from '../../hooks/useSelectedWeek';
import { useTraineeWeeks } from '../../hooks/useTraineeWeeks';
import { dayIn } from '../../hooks/useWorkoutLogs';
import { ConsistencyCard } from '../ConsistencyCard/ConsistencyCard';
import { EmptyWeekStarts } from '../EmptyWeekStarts/EmptyWeekStarts';
import { WeekCalendar } from '../WeekCalendar/WeekCalendar';
import { WeekHero } from '../WeekHero/WeekHero';
import { WeekInfo } from '../WeekInfo/WeekInfo';
import { WeekRail } from '../WeekRail/WeekRail';
import type { TraineePlansLoad } from '../../hooks/useTraineePlans';
import { NewPlanPopover } from '../NewPlanPopover/NewPlanPopover';
import { PlansToolbar } from '../PlansToolbar/PlansToolbar';
import { PlanStartOptions } from '../PlanStartOptions/PlanStartOptions';
import './TraineePlans.css';
import { traineesCopy } from '../../copy';

interface TraineePlansProps {
  trainee: CoachTraineeDetail;
  /** Her plans, loaded by the page. */
  plansLoad: TraineePlansLoad;
  /** The header's "build plan" was pressed: open the "new plan" popover, then report it handled. */
  wantsNewPlan: boolean;
  onNewPlanHandled: () => void;
  /** A plan was created — the trainee's status may have changed. */
  onPlansChanged: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HERO_ID = 'pw-week-panel';
/** The new-plan popover offers this week and the next three. */
const STARTABLE_DAYS = 21;

/**
 * The Plans tab. Without plans: the AI draft as the main card, with "from scratch" beside it.
 * With plans: a rail of her program's weeks, the selected week (its facts and calendar, or ways
 * to start it), and her consistency over the program. Every new plan starts in the "new plan"
 * popover; the AI draft's options live in its side sheet.
 */
export function TraineePlans({ trainee, plansLoad, wantsNewPlan, onNewPlanHandled, onPlansChanged }: TraineePlansProps) {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const { plans, error, isLoading, reload } = plansLoad;
  const ai = useLatestAiDraft(trainee.id);
  const config = useTrainingConfig();
  const { nowMs } = useCoachData();
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
  const popover = useNewPlanPopover(trainee.id, ai.ready?.id, () => {
    reload();
    onPlansChanged();
  });
  const openNewPlan = popover.open;
  const weeks = useTraineeWeeks(plans, trainee.currentWeekStart);
  const { selected, select } = useSelectedWeek(weeks, trainee.currentWeekStart);
  // Her today, on the server's clock, in her zone.
  const today = dayIn(new Date(nowMs).toISOString(), trainee.timezone);

  // "New plan" from the top line or the drawer (its AI strip: on "from the AI draft") — and "duplicate last week" from the plan builder —
  // land here with the popover already open.
  const linkState = useLocation().state as { newPlan?: boolean; duplicate?: boolean; ai?: boolean } | null;
  const cameForNewPlan = linkState?.newPlan === true;
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (!cameForNewPlan || openedFromLink.current) return;
    openedFromLink.current = true;
    void openNewPlan({ method: linkState?.ai ? 'ai' : linkState?.duplicate ? 'duplicate' : 'scratch' });
    // Once, when the page is entered that way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameForNewPlan]);

  // The header's pink pill.
  useEffect(() => {
    if (!wantsNewPlan) return;
    onNewPlanHandled();
    void openNewPlan();
  }, [wantsNewPlan, onNewPlanHandled, openNewPlan]);

  const hasPlans = plans !== undefined && plans.length > 0;
  const nextWeekStart = addDaysToDate(trainee.currentWeekStart, 7);
  const daysUntil = (date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  const startWeek = (method: PlanStartMethod, week: string) => void openNewPlan({ method, week });

  function selectFromChart(weekStartDate: string) {
    select(weekStartDate);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(HERO_ID)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function weekPanel() {
    if (!selected) return null;
    const label = fill(copy.weeks.week, { number: selected.number });
    const plan = selected.plan;
    if (!plan) {
      const previous = weeks.find((week) => week.weekStartDate === addDaysToDate(selected.weekStartDate, -7));
      return (
        <WeekHero tone="empty" id={HERO_ID} label={label}>
          <EmptyWeekStarts
            week={selected}
            previous={previous}
            canStart={selected.time !== 'past' && daysUntil(selected.weekStartDate) <= STARTABLE_DAYS}
            hasAiDraft={ai.ready !== null}
            onStart={(method) => startWeek(method, selected.weekStartDate)}
          />
        </WeekHero>
      );
    }
    const isDraft = plan.status === 'draft';
    const to = planPath(trainee.id, plan.id);
    const actions = isDraft ? (
      <PillButton variant="primary" to={to}>
        {copy.continueAndPublish}
      </PillButton>
    ) : selected.time === 'past' ? (
      <PillButton variant="fill" to={to}>
        {copy.weeks.viewInBuilder}
      </PillButton>
    ) : (
      <>
        <PillButton variant="primary" to={to}>
          {copy.openInBuilderShort}
        </PillButton>
        {selected.time === 'current' && <PillButton onClick={() => startWeek('duplicate', nextWeekStart)}>{copy.weeks.duplicateToNext}</PillButton>}
      </>
    );
    return (
      <WeekHero tone={isDraft ? 'draft' : selected.time === 'past' ? 'past' : 'current'} id={HERO_ID} label={label}>
        <WeekInfo
          week={{ ...selected, plan }}
          traineeName={trainee.name}
          startsInDays={selected.time === 'future' ? daysUntil(selected.weekStartDate) : null}
          actions={actions}
        />
        <WeekCalendar traineeId={trainee.id} plan={plan} today={today} />
      </WeekHero>
    );
  }

  return (
    <div className="trainee-plans">
      {/* The popover hangs from this bar; a trainee without plans has no pills in it. */}
      <div className="plans-bar">
        {hasPlans && <PlansToolbar onStart={(method) => void openNewPlan({ method })} />}
        <NewPlanPopover
          popover={popover}
          traineeId={trainee.id}
          aiWorkoutCount={ai.ready?.output?.workouts.length}
          onOpenAiOptions={() => {
            popover.close();
            setIsAiSheetOpen(true);
          }}
        />
      </div>

      {isLoading && <p className="plans-message">{shared.common.loading}</p>}
      {error && (
        <p className="plans-message" role="alert">
          {error}{' '}
          <PillButton size="sm" onClick={reload}>
            {shared.common.retry}
          </PillButton>
        </p>
      )}

      {plans && !hasPlans && (
        <div className="plans-start-grid">
          <AiPlanCard
            ai={ai}
            disabled={popover.isCreating}
            onOpenInBuilder={() => void openNewPlan({ method: 'ai' })}
            onOpenOptions={() => setIsAiSheetOpen(true)}
          />
          <PlanStartOptions disabled={popover.isCreating} onFromScratch={() => void openNewPlan()} />
        </div>
      )}

      {hasPlans && selected && (
        <>
          <WeekRail weeks={weeks} selected={selected.weekStartDate} onSelect={select} panelId={HERO_ID} />
          {weekPanel()}
          <ConsistencyCard weeks={weeks} selected={selected.weekStartDate} onSelect={selectFromChart} />
        </>
      )}

      <AiDraftSheet
        isOpen={isAiSheetOpen}
        onClose={() => setIsAiSheetOpen(false)}
        traineeId={trainee.id}
        ai={ai}
        config={config}
        linkedRecommendationId={undefined}
        canApply={!popover.isCreating}
        onUseFullPlan={(recommendation) => {
          setIsAiSheetOpen(false);
          void openNewPlan({ method: 'ai', aiStart: { loadAiDraftId: recommendation.id } });
        }}
        onUseSplitOnly={(option, recommendation) => {
          setIsAiSheetOpen(false);
          void openNewPlan({ method: 'ai', aiStart: { splitOnly: { splitId: option.splitId, daysPerWeek: option.daysPerWeek, recommendationId: recommendation.id } } });
        }}
      />
    </div>
  );
}
