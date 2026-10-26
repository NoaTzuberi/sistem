import { useCallback } from 'react';
import type { CoachTraineeDetail } from '@sistem/types';
import { sharedCopy, useCopy, useLoad } from '@sistem/shared';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { listTraineeBodyMetrics } from '../../../../services/coach/coachService';
import { bodyCopy } from '../../../bodyTracking/copy';
import { coachCopy } from '../../copy';
import type { TraineeTab } from '../../data/traineeTabs';
import { useTraineeWorkouts } from '../../hooks/useTraineeWorkouts';
import { BodyScoreboard } from '../BodyScoreboard/BodyScoreboard';
import { CoachCard } from '../CoachCard/CoachCard';
import { LastWorkouts } from '../LastWorkouts/LastWorkouts';
import { NutritionDay } from '../NutritionDay/NutritionDay';
import { TraineeAchievements } from '../TraineeAchievements/TraineeAchievements';
import { WeekLanes } from '../WeekLanes/WeekLanes';

const LAST_SHOWN = 3;

interface TraineeOverviewProps {
  trainee: CoachTraineeDetail;
  today: string;
  onOpenTab: (tab: TraineeTab) => void;
}

/** סקירה: this week's lanes, the last 3 workouts, today's portions, the body numbers, her achievements. */
export function TraineeOverview({ trainee, today, onOpenTab }: TraineeOverviewProps) {
  const copy = useCopy(coachCopy).detail;
  const shared = useCopy(sharedCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const body = useCopy(bodyCopy);
  const workouts = useTraineeWorkouts(trainee.id);
  const loadBody = useCallback(() => listTraineeBodyMetrics(trainee.id), [trainee.id]);
  const metrics = useLoad(loadBody, body.coachLoadError);

  return (
    <>
      <CoachCard title={copy.thisWeek} eyebrow={eyebrow.thisWeek}>
        {trainee.thisWeek ? (
          <WeekLanes week={trainee.thisWeek} weekStart={trainee.currentWeekStart} today={today} />
        ) : (
          <p className="coach-card-text">{copy.noPlanThisWeek}</p>
        )}
      </CoachCard>

      <CoachCard
        title={copy.lastWorkouts}
        eyebrow={eyebrow.last}
        action={
          <button type="button" className="coach-link" onClick={() => onOpenTab('workouts')}>
            {copy.all}
          </button>
        }
      >
        {workouts.isLoading && !workouts.data && <StateMessage>{shared.common.loading}</StateMessage>}
        {workouts.error && !workouts.data && <StateMessage onRetry={workouts.reload}>{workouts.error}</StateMessage>}
        {workouts.data &&
          (workouts.data.length > 0 ? (
            <LastWorkouts workouts={workouts.data.slice(0, LAST_SHOWN)} timezone={trainee.timezone} />
          ) : (
            <p className="coach-card-text">{copy.noWorkouts}</p>
          ))}
      </CoachCard>

      <NutritionDay traineeId={trainee.id} compact />

      <CoachCard title={copy.body} eyebrow={eyebrow.body}>
        {metrics.isLoading && !metrics.data && <StateMessage>{shared.common.loading}</StateMessage>}
        {metrics.error && !metrics.data && <StateMessage onRetry={metrics.reload}>{metrics.error}</StateMessage>}
        {metrics.data && <BodyScoreboard metrics={metrics.data.items} measurementIds={metrics.data.measurementIds} />}
      </CoachCard>

      <CoachCard>
        <TraineeAchievements traineeId={trainee.id} compact />
      </CoachCard>
    </>
  );
}
