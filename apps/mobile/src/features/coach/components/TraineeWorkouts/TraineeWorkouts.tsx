import type { CoachTraineeDetail } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { coachCopy } from '../../copy';
import { dashboardLinks } from '../../data/dashboardLinks';
import { useTraineeWorkouts } from '../../hooks/useTraineeWorkouts';
import { CoachSection } from '../CoachSection/CoachSection';
import { DeskNote } from '../DeskNote/DeskNote';
import { LastWorkouts } from '../LastWorkouts/LastWorkouts';
import { TraineePlan } from '../TraineePlan/TraineePlan';
import { WorkoutLogList } from '../WorkoutLogList/WorkoutLogList';

const LOG_PAGE = 10;

interface TraineeWorkoutsProps {
  trainee: CoachTraineeDetail;
  onPlansChanged: () => void;
  /** Bumped after a light edit: the plans load again. */
  plansVersion: number;
  /** Opens the light edit sheet ("עריכה קלה"). */
  onOpenEdit: () => void;
}

/** אימונים: this + next week's plan (workout cards, the light plan actions), the full workout log (paged), her cardio, the dashboard note. */
export function TraineeWorkouts({ trainee, onPlansChanged, plansVersion, onOpenEdit }: TraineeWorkoutsProps) {
  const copy = useCopy(coachCopy).detail;
  const edit = useCopy(coachCopy).edit;
  const workouts = useTraineeWorkouts(trainee.id);
  const cardio = (workouts.data ?? []).filter((entry) => entry.kind === 'cardio');

  return (
    <>
      <CoachSection
        title={copy.actions.plan}
        action={
          <button type="button" className="coach-link" aria-haspopup="dialog" onClick={onOpenEdit}>
            {edit.open}
          </button>
        }
      >
        <TraineePlan trainee={trainee} onPlansChanged={onPlansChanged} refreshKey={plansVersion} />
      </CoachSection>

      <CoachSection title={copy.workoutLog}>
        <WorkoutLogList traineeId={trainee.id} pageSize={LOG_PAGE} moreLabel={copy.moreWorkouts} />
      </CoachSection>

      {cardio.length > 0 && (
        <CoachSection title={copy.cardioLog}>
          <LastWorkouts workouts={cardio} timezone={trainee.timezone} />
        </CoachSection>
      )}

      <DeskNote text={copy.deskWorkouts} href={dashboardLinks.traineePlans(trainee.id)} />
    </>
  );
}
