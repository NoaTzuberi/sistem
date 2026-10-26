import type { CoachTraineeDetail } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../../copy';
import { coachCopy } from '../../copy';
import { dashboardLinks } from '../../data/dashboardLinks';
import { useTraineeWorkouts } from '../../hooks/useTraineeWorkouts';
import { CoachCard } from '../CoachCard/CoachCard';
import { DeskNote } from '../DeskNote/DeskNote';
import { LastWorkouts } from '../LastWorkouts/LastWorkouts';
import { TraineePlan } from '../TraineePlan/TraineePlan';
import { WeekLanes } from '../WeekLanes/WeekLanes';
import { WorkoutLogList } from '../WorkoutLogList/WorkoutLogList';

const LOG_PAGE = 10;

interface TraineeWorkoutsProps {
  trainee: CoachTraineeDetail;
  today: string;
  onPlansChanged: () => void;
}

/** אימונים: the week (+ the light plan actions), the full workout log (paged), her cardio, the dashboard note. */
export function TraineeWorkouts({ trainee, today, onPlansChanged }: TraineeWorkoutsProps) {
  const copy = useCopy(coachCopy).detail;
  const eyebrow = useCopy(appCopy).eyebrow;
  const workouts = useTraineeWorkouts(trainee.id);
  const cardio = (workouts.data ?? []).filter((entry) => entry.kind === 'cardio');

  return (
    <>
      <CoachCard title={copy.thisWeek} eyebrow={eyebrow.thisWeek}>
        {trainee.thisWeek && <WeekLanes week={trainee.thisWeek} weekStart={trainee.currentWeekStart} today={today} />}
        <TraineePlan trainee={trainee} onPlansChanged={onPlansChanged} />
      </CoachCard>

      <CoachCard title={copy.workoutLog} eyebrow={eyebrow.log}>
        <WorkoutLogList traineeId={trainee.id} pageSize={LOG_PAGE} moreLabel={copy.moreWorkouts} />
      </CoachCard>

      {cardio.length > 0 && (
        <CoachCard title={copy.cardioLog}>
          <LastWorkouts workouts={cardio} timezone={trainee.timezone} />
        </CoachCard>
      )}

      <DeskNote text={copy.deskWorkouts} href={dashboardLinks.traineePlans(trainee.id)} />
    </>
  );
}
