import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CoachTraineeSummary } from '@sistem/types';
import {
  dayName,
  fill,
  formatNumber,
  formatTimeAgo,
  formatWeekSpan,
  labelList,
  sharedCopy,
  splitLabel,
  useCopy,
  useI18n,
} from '@sistem/shared';
import { AI_PLAN_STATE, NEW_PLAN_STATE, planPath } from '../../../../app/config/routes';
import { Icon } from '../../../../components/common/Icon/Icon';
import { useDrawerTransition } from '../../../../hooks/useDrawerTransition';
import { useCoachData } from '../../../../services/coach/CoachDataContext';
import { traineesCopy } from '../../copy';
import { describeDaysPerWeek } from '../../data/traineeFacts';
import { DRAWER_TABS, traineeTabLabel } from '../../data/traineeTabs';
import { useTraineeDrawer } from '../../hooks/useTraineeDrawer';
import { useTraineeQuickView } from '../../hooks/useTraineeQuickView';
import { AiDraftStrip } from '../AiDraftStrip/AiDraftStrip';
import { ProfileLinksList } from '../ProfileLinksList/ProfileLinksList';
import { QuestionnaireSnippet } from '../QuestionnaireSnippet/QuestionnaireSnippet';
import { QuickFacts } from '../QuickFacts/QuickFacts';
import { QuickViewFooter } from '../QuickViewFooter/QuickViewFooter';
import { QuickViewHero } from '../QuickViewHero/QuickViewHero';
import { StatusSpotlight } from '../StatusSpotlight/StatusSpotlight';
import type { SpotlightView } from '../StatusSpotlight/StatusSpotlight';
import './TraineeQuickView.css';

// = --transition-drawer-out: the drawer leaves the page once its slide-out is over.
const CLOSE_MS = 200;
const FOCUSABLE = 'a[href], button:not([disabled])';
const NAME_ID = 'tqv-name';
/** A recovery answer that is not a limitation. */
const NOTHING_TO_ADD = 'nothing_to_add';

/**
 * The trainee quick view: a floating drawer on the far side from the sidebar. Opens on the
 * drawer curve and closes faster; Esc and the scrim close it, Tab stays inside it, and the
 * focus goes back to the row that opened it.
 */
export function TraineeQuickView() {
  const { openTraineeId, closeDrawer } = useTraineeDrawer();
  const { trainees } = useCoachData();
  const shared = useCopy(sharedCopy);
  const isOpen = openTraineeId !== null;
  const { isMounted, isShown } = useDrawerTransition(isOpen, CLOSE_MS);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // While it slides out, the drawer still shows the trainee it was opened for.
  const lastId = useRef(openTraineeId);
  if (openTraineeId) lastId.current = openTraineeId;
  const trainee = trainees.find((item) => item.id === lastId.current);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDrawer();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer]);

  useEffect(() => {
    if (isOpen && isMounted) closeRef.current?.focus();
  }, [isOpen, isMounted]);

  // Tab stays inside the drawer while it is open (it is modal).
  function keepFocusInside(event: ReactKeyboardEvent) {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  if (!isMounted || !trainee) return null;

  return (
    <>
      <div className={isShown ? 'tqv-scrim tqv-scrim-shown' : 'tqv-scrim'} onClick={closeDrawer} />
      <aside
        ref={panelRef}
        className={isShown ? 'tqv tqv-shown' : 'tqv'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={NAME_ID}
        inert={!isOpen}
        onKeyDown={keepFocusInside}
      >
        <button ref={closeRef} className="tqv-close" type="button" aria-label={shared.common.close} onClick={closeDrawer}>
          <Icon name="close" size="sm" />
        </button>
        {/* Keyed by her id: each open starts at the top, with the ring filling again. */}
        <QuickViewContent key={trainee.id} trainee={trainee} />
      </aside>
    </>
  );
}

function QuickViewContent({ trainee }: { trainee: CoachTraineeSummary }) {
  const { language } = useI18n();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const { plural } = useI18n();
  const navigate = useNavigate();
  const { openProfile } = useTraineeDrawer();
  const view = useTraineeQuickView(trainee);
  const { week, status, nowMs, window: planWindow } = view;
  const qv = copy.quickView;
  const plan = week?.currentPlan ?? null;

  const lastActivity = trainee.lastActivityAt
    ? fill(shared.coach.lastActivityAt, { time: formatTimeAgo(trainee.lastActivityAt, nowMs, language) })
    : null;
  const planName = plan
    ? [formatWeekSpan(plan.weekStartDate, language), plan.splitId ? splitLabel(plan.splitId, language) : null].filter(Boolean).join(' · ')
    : null;

  // --- The spotlight -----------------------------------------------------------------------
  let spotlight: SpotlightView;
  if (status === 'waiting' && planWindow) {
    spotlight = planWindow.isLate
      ? { tone: 'late', fill: 1, center: '!', title: planWindow.title, text: qv.windowLateText }
      : { tone: 'window', fill: planWindow.elapsed, center: planWindow.clock, title: planWindow.title, text: qv.windowLeftText };
  } else if ((status === 'active' || status === 'attention') && plan) {
    const missed = plan.workouts.filter((workout) => workout.status === 'missed').length;
    spotlight = {
      tone: status,
      fill: plan.planned > 0 ? plan.completed / plan.planned : 0,
      center: `${plan.completed}/${plan.planned}`,
      title: status === 'attention' ? plural(qv.missed, missed) : fill(qv.weekDone, { done: plan.completed, planned: plan.planned }),
      text: [planName, lastActivity].filter(Boolean).join(' · '),
      workoutsLabel: qv.workoutsLabel,
      workouts: plan.workouts.map((workout, index) => ({
        id: workout.id,
        // A, B, C … — the plan's own order.
        letter: String.fromCharCode(65 + index),
        index,
        state: workout.status === 'done' ? 'done' : workout.status === 'missed' ? 'missed' : 'upcoming',
        caption:
          workout.status === 'done'
            ? copy.done
            : workout.status === 'missed'
              ? qv.skipped
              : workout.dayOfWeek === null
                ? shared.common.none
                : dayName(workout.dayOfWeek, language),
      })),
    };
  } else {
    spotlight = {
      tone: 'idle',
      fill: 0,
      center: shared.common.none,
      // Inactive: her last plan is behind her. New: not through the questionnaire yet — her status says it.
      title: trainee.status === 'inactive' ? qv.planEnded : shared.traineeStatus.labels[trainee.status],
      text: lastActivity ?? '',
    };
  }

  // --- Facts, questionnaire, links ---------------------------------------------------------
  const facts = [
    { id: 'goal' as const, label: qv.goal, value: labelList(week?.goals, shared.onboardingOptions.goals, language) },
    { id: 'days' as const, label: qv.daysPerWeek, value: week?.daysPerWeek ? describeDaysPerWeek(week.daysPerWeek) : shared.common.none },
    { id: 'plan' as const, label: copy.plan, value: planName ?? qv.noPlanYet },
    {
      id: 'consistency' as const,
      label: qv.consistency,
      value: plan && plan.planned > 0 ? formatNumber(plan.completed / plan.planned, language, { style: 'percent', maximumFractionDigits: 0 }) : shared.common.none,
    },
  ];

  const answers = view.onboarding?.answers;
  const summaryParts = [
    answers?.preferredActivities?.length ? labelList(answers.preferredActivities, shared.onboardingOptions.activities, language) : null,
    week?.daysPerWeek ? fill(copy.daysPerWeek, { days: describeDaysPerWeek(week.daysPerWeek) }) : null,
  ].filter(Boolean);
  const recoveryLabels: Readonly<Record<string, string>> = shared.onboardingOptions.recoveryFlags;
  const flags = [
    ...(answers?.recovery?.flags ?? []).filter((flag) => flag !== NOTHING_TO_ADD).map((flag) => recoveryLabels[flag] ?? flag),
    ...(answers?.recovery?.notes?.trim() ? [answers.recovery.notes.trim()] : []),
  ];

  const links = DRAWER_TABS.map((tab) => ({ tab, label: traineeTabLabel(tab, copy, shared), count: tab === 'plans' ? view.planCount : undefined }));

  const ai = view.aiDraft;
  const aiSplit = ai ? (ai.splitId ? splitLabel(ai.splitId, language) : (ai.split ?? '')) : '';

  // --- The next step -----------------------------------------------------------------------
  const primary =
    status === 'waiting'
      ? { label: qv.buildPlan, run: () => openProfile(trainee.id, 'plans', NEW_PLAN_STATE) }
      : plan && (status === 'active' || status === 'attention')
        ? { label: copy.openWeekPlan, run: () => navigate(planPath(trainee.id, plan.id)) }
        : { label: copy.newPlan, run: () => openProfile(trainee.id, 'plans', NEW_PLAN_STATE) };

  return (
    <>
      <div className="tqv-body">
        <QuickViewHero
          name={trainee.name}
          photoUrl={trainee.avatar?.url ?? null}
          nameId={NAME_ID}
          status={status}
          statusLabel={shared.traineeStatus.labels[trainee.status]}
          lastActivity={lastActivity}
        />
        <StatusSpotlight view={spotlight} />
        {status === 'waiting' && ai && (
          <AiDraftStrip
            title={copy.aiReadyTag}
            meta={fill(qv.aiMeta, { split: aiSplit, days: ai.workouts.length })}
            openLabel={qv.aiOpen}
            onOpen={() => openProfile(trainee.id, 'plans', AI_PLAN_STATE)}
          />
        )}
        <QuickFacts facts={facts} />
        {status === 'waiting' && (
          <QuestionnaireSnippet title={qv.fromQuestionnaire} summary={summaryParts.length ? summaryParts.join(' · ') : null} flags={flags} />
        )}
        <ProfileLinksList title={qv.inFullProfile} links={links} onOpen={(tab) => openProfile(trainee.id, tab)} />
      </div>
      <QuickViewFooter fullProfileLabel={qv.fullProfile} onFullProfile={() => openProfile(trainee.id)} primaryLabel={primary.label} onPrimary={primary.run} />
    </>
  );
}
