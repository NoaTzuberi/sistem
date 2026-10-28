import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IconBarbell, IconChevronLeft, IconMessageCircle, IconSalad } from '@tabler/icons-react';
import { fill, formatPlural, sharedCopy, splitLabel, useCopy, useLanguage, useLoad, useServerNow } from '@sistem/shared';
import { ROUTES, coachThreadPath } from '../../../../app/config/routes';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { getTrainee } from '../../../../services/coach/coachService';
import { SegmentedTabs } from '../../../workouts/components/SegmentedTabs/SegmentedTabs';
import { coachCopy } from '../../copy';
import { localDateOf, monthYearOf, weekEyebrow } from '../../data/coachMode';
import { DEFAULT_TRAINEE_TAB, TRAINEE_TABS, TRAINEE_TAB_PARAM, type TraineeTab, traineeTabOf } from '../../data/traineeTabs';
import { CoachAvatar } from '../../components/CoachAvatar/CoachAvatar';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { CoachStage } from '../../components/CoachStage/CoachStage';
import { TraineeBody } from '../../components/TraineeBody/TraineeBody';
import { TraineeNutritionTab } from '../../components/TraineeNutritionTab/TraineeNutritionTab';
import { TraineeOverview } from '../../components/TraineeOverview/TraineeOverview';
import { TraineeWorkouts } from '../../components/TraineeWorkouts/TraineeWorkouts';
import { QuickMessageSheet } from '../../components/QuickMessageSheet/QuickMessageSheet';
import { PlanQuickEditSheet } from '../../components/PlanQuickEditSheet/PlanQuickEditSheet';
import { useQuickMessage } from '../../hooks/useQuickMessage';
import { usePlanQuickEdit } from '../../hooks/usePlanQuickEdit';
import { TraineeMoreMenu } from '../../components/TraineeMoreMenu/TraineeMoreMenu';
import { EndCoachingSheet } from '../../components/EndCoachingSheet/EndCoachingSheet';
import { useTraineeEndCoaching } from '../../hooks/useTraineeEndCoaching';
import './TraineeDetailPage.css';

// Coach mode: one trainee (docs/design/coach-app.html) — read in Phase A; Phase B adds the message and light edit sheets. The server answers 404 for a
// trainee who is not this coach's (no live coaching), which shows as the load error.
export function TraineeDetailPage() {
  const { traineeId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = traineeTabOf(searchParams.get(TRAINEE_TAB_PARAM));
  const copy = useCopy(coachCopy);
  const shared = useCopy(sharedCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();
  const load = useCallback(() => getTrainee(traineeId), [traineeId]);
  const { data, error, isLoading, reload } = useLoad(load, shared.coach.loadTraineeError);
  const nowMs = useServerNow(data?.serverTime);
  const trainee = data?.trainee;
  const ending = useTraineeEndCoaching(traineeId);
  const navigate = useNavigate();
  const { toastMessage, toastAction, showToast } = useToast();
  // Bumped after a light edit: the plan lists below load again.
  const [plansVersion, setPlansVersion] = useState(0);
  const onPlansChanged = useCallback(() => {
    reload();
    setPlansVersion((version) => version + 1);
  }, [reload]);
  const edit = usePlanQuickEdit(trainee, trainee ? localDateOf(nowMs, trainee.timezone) : '', showToast, onPlansChanged);
  const quick = useQuickMessage(
    useCallback(
      (recipient) => showToast(copy.messages.sent, { label: copy.messages.openThread, onSelect: () => navigate(coachThreadPath(recipient.id)) }),
      [showToast, navigate, copy.messages.sent, copy.messages.openThread],
    ),
  );

  function selectTab(next: TraineeTab) {
    setSearchParams(next === DEFAULT_TRAINEE_TAB ? {} : { [TRAINEE_TAB_PARAM]: next }, { replace: true });
  }

  const sub = trainee
    ? [
        fill(copy.detail.since, { date: monthYearOf(trainee.coachingStartedAt, trainee.timezone) }),
        trainee.thisWeek?.splitId ? splitLabel(trainee.thisWeek.splitId, language) : null,
        trainee.thisWeek && trainee.thisWeek.planned > 0 ? formatPlural(language, copy.detail.perWeek, trainee.thisWeek.planned) : null,
      ].filter(Boolean)
    : [];

  return (
    <CoachScreen
      top={
        <CoachStage labelledBy="coach-trainee-name">
          <div className="coach-stage-bar">
            <Link className="coach-stage-round" to={ROUTES.COACH_TRAINEES} aria-label={copy.detail.back}>
              <IconChevronLeft className="flip-rtl" size={18} stroke={2.2} aria-hidden="true" />
            </Link>
            <span className="coach-stage-spacer" />
            <Eyebrow keepInEnglish>
              {trainee?.coachingWeek ? `${eyebrow.trainee} · ${weekEyebrow(eyebrow.week, trainee.coachingWeek)}` : eyebrow.trainee}
            </Eyebrow>
            {trainee && <TraineeMoreMenu onEndCoaching={ending.ask} />}
          </div>
          {trainee && (
            <>
              <div className="coach-trainee-id">
                <CoachAvatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} size="xl" />
                <div className="coach-trainee-id-text">
                  <h1 className="coach-trainee-name display-title" id="coach-trainee-name">
                    <bdi>{trainee.name}</bdi>
                  </h1>
                  <p className="coach-trainee-sub">{sub.join(' · ')}</p>
                </div>
              </div>
              <div className="coach-trainee-actions" role="group" aria-label={copy.detail.actionsLabel}>
                <button
                  type="button"
                  className="coach-trainee-action coach-trainee-action-primary"
                  aria-haspopup="dialog"
                  onClick={() => quick.open({ id: trainee.id, name: trainee.name, avatarUrl: trainee.avatar?.url })}
                >
                  <IconMessageCircle size={20} aria-hidden="true" />
                  {copy.detail.actions.message}
                </button>
                <button type="button" className="coach-trainee-action" aria-haspopup="dialog" onClick={() => edit.open()}>
                  <IconBarbell size={20} aria-hidden="true" />
                  {copy.detail.actions.plan}
                </button>
                <button type="button" className="coach-trainee-action" onClick={() => selectTab('nutrition')}>
                  <IconSalad size={20} aria-hidden="true" />
                  {copy.detail.actions.nutrition}
                </button>
              </div>
            </>
          )}
        </CoachStage>
      }
    >
      {isLoading && !trainee && <StateMessage>{shared.common.loading}</StateMessage>}
      {error && !trainee && <StateMessage onRetry={reload}>{error}</StateMessage>}

      {trainee && (
        <>
          <div className="coach-trainee-tabs">
            <SegmentedTabs
              className="coach-tabs"
              tabs={TRAINEE_TABS.map((id) => ({ id, label: copy.detail.tabs[id] }))}
              selected={tab}
              onSelect={selectTab}
              label={copy.detail.tabsLabel}
              panelId={() => 'coach-trainee-panel'}
            />
          </div>
          <section role="tabpanel" id="coach-trainee-panel" aria-labelledby={`tab-${tab}`} className="coach-trainee-panel">
            {tab === 'overview' && <TraineeOverview trainee={trainee} today={localDateOf(nowMs, trainee.timezone)} onOpenTab={selectTab} />}
            {tab === 'workouts' && (
              <TraineeWorkouts
                trainee={trainee}
                today={localDateOf(nowMs, trainee.timezone)}
                onPlansChanged={onPlansChanged}
                plansVersion={plansVersion}
                onOpenEdit={() => void edit.open()}
              />
            )}
            {tab === 'nutrition' && <TraineeNutritionTab traineeId={trainee.id} />}
            {tab === 'body' && <TraineeBody trainee={trainee} />}
          </section>
          <PlanQuickEditSheet edit={edit} />
          <EndCoachingSheet
            name={trainee.name}
            isOpen={ending.isConfirming}
            isEnding={ending.isEnding}
            error={ending.error}
            onConfirm={() => void ending.confirm()}
            onCancel={ending.cancel}
          />
        </>
      )}
      <QuickMessageSheet quick={quick} />
      <Toast message={toastMessage} action={toastAction} />
    </CoachScreen>
  );
}
