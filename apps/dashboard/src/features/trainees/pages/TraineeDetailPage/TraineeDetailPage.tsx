import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getTrainee } from '../../../../services/coach/coachService';
import { sharedCopy, useCopy, useLoad, useServerNow } from '@sistem/shared';
import { ROUTES, planPath } from '../../../../app/config/routes';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { useCoachData } from '../../../../services/coach/CoachDataContext';
import { OnboardingAnswers } from '../../components/OnboardingAnswers/OnboardingAnswers';
import { TraineeHeader } from '../../components/TraineeHeader/TraineeHeader';
import { TraineePlans } from '../../components/TraineePlans/TraineePlans';
import { TraineeTabs } from '../../components/TraineeTabs/TraineeTabs';
import { WorkoutLogList } from '../../components/WorkoutLogList/WorkoutLogList';
import { BodyTracking } from '../../components/BodyTracking/BodyTracking';
import { TraineeAchievements } from '../../components/TraineeAchievements/TraineeAchievements';
import { TraineeNutritionTab } from '../../../nutrition/components/TraineeNutritionTab/TraineeNutritionTab';
import { useTraineePlans } from '../../hooks/useTraineePlans';
import { useTraineeTab } from '../../hooks/useTraineeTab';
import { traineeTabId } from '../../data/traineeTabs';
import './TraineeDetailPage.css';
import { traineesCopy } from '../../copy';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';

const PANEL_ID = 'trainee-tab-panel';

/** A trainee's profile: the header card, her sections as pill tabs, and the open section. */
export function TraineeDetailPage() {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const navigate = useNavigate();
  const { traineeId = '' } = useParams();
  const [tab, selectTab] = useTraineeTab(traineeId);

  const load = useCallback(() => getTrainee(traineeId), [traineeId]);
  const { data, error, isLoading, reload } = useLoad(load, shared.coach.loadTraineeError);
  const nowMs = useServerNow(data?.serverTime);
  const trainee = data?.trainee;
  const plansLoad = useTraineePlans(traineeId);
  const { weekOf } = useCoachData();
  // The header's pink pill asks the Plans tab for its week picker.
  const [wantsNewPlan, setWantsNewPlan] = useState(false);
  const handleNewPlanHandled = useCallback(() => setWantsNewPlan(false), []);

  // "Build plan" / "Next week": next week's plan when she already has one, else a new plan (the
  // week picker of the Plans tab — the server decides which week it offers first).
  function handleBuildPlan() {
    const nextWeekPlan = trainee?.status === 'active' ? weekOf(traineeId)?.nextWeekPlan : null;
    if (nextWeekPlan) {
      navigate(planPath(traineeId, nextWeekPlan.id));
      return;
    }
    selectTab('plans');
    setWantsNewPlan(true);
  }

  return (
    <div className="trainee-detail">
      <Link className="trainee-back" to={ROUTES.TRAINEES}>
        {copy.backToAllTrainees}
      </Link>

      {isLoading && !trainee && <Skeleton layout="profile" />}
      {error && !trainee && (
        <p className="trainee-message" role="alert">
          {error}{' '}
          <PillButton size="sm" onClick={reload}>
            {shared.common.retry}
          </PillButton>
        </p>
      )}

      {trainee && (
        <>
          <TraineeHeader trainee={trainee} nowMs={nowMs} onBuildPlan={handleBuildPlan} />
          <TraineeTabs selected={tab} counts={{ plans: plansLoad.plans?.length }} panelId={PANEL_ID} onSelect={selectTab} />

          <section
            className="trainee-panel"
            role="tabpanel"
            id={PANEL_ID}
            aria-labelledby={traineeTabId(tab)}
          >
            {tab === 'onboarding' && <OnboardingAnswers traineeId={trainee.id} onboarding={trainee.onboarding} />}
            {tab === 'plans' && <TraineePlans trainee={trainee} plansLoad={plansLoad} wantsNewPlan={wantsNewPlan}
                onNewPlanHandled={handleNewPlanHandled}
                onPlansChanged={reload} />}
            {tab === 'nutrition' && <TraineeNutritionTab traineeId={trainee.id} />}
            {tab === 'logs' && <WorkoutLogList traineeId={trainee.id} timezone={trainee.timezone} currentWeekStart={trainee.currentWeekStart} />}
            {tab === 'metrics' && <BodyTracking traineeId={trainee.id} traineeName={trainee.name} timezone={trainee.timezone} />}
            {tab === 'achievements' && <TraineeAchievements traineeId={trainee.id} />}
          </section>
        </>
      )}
    </div>
  );
}
