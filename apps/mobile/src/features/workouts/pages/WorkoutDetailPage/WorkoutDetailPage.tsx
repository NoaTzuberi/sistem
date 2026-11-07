import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCopy, useLoad } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { getPlan } from '../../../../services/plans/plansService';
import { workoutLogPath } from '../../../../app/config/routes';
import { useActiveCoachings } from '../../../../hooks/useActiveCoachings';
import { StartConflictModal } from '../../components/StartConflictModal/StartConflictModal';
import { useStartWorkout } from '../../hooks/useStartWorkout';
import { BackButton } from '../../components/BackButton/BackButton';
import { WorkoutDetailHero } from '../../components/WorkoutDetailHero/WorkoutDetailHero';
import { WorkoutCoachNote } from '../../components/WorkoutCoachNote/WorkoutCoachNote';
import { WorkoutExerciseCards } from '../../components/WorkoutExerciseCards/WorkoutExerciseCards';
import { workoutCopy } from '../../copy';
import './WorkoutDetailPage.css';

// One planned workout (PRD §5.4, direction B): the hero card with Start / Resume for this week's
// workouts (Phase 8), the coach's note and the exercises with the server's resolved sets.
export function WorkoutDetailPage() {
  const copy = useCopy(workoutCopy);
  const { planId = '', workoutId = '' } = useParams();
  const load = useCallback(() => getPlan(planId), [planId]);
  const { data: plan, error, isLoading, reload } = useLoad(load, copy.list.workoutLoadError);
  const workout = plan?.workouts.find((item) => item.id === workoutId);
  const starter = useStartWorkout();
  const { coachings } = useActiveCoachings(Boolean(workout?.notes));
  const coachName = coachings[0]?.coachName || null;

  const action =
    plan && workout ? (
      workout.logId ? (
        <Link className="wk-detail-log-link" to={workoutLogPath(workout.logId)}>
          {copy.list.viewLog}
        </Link>
      ) : plan.period === 'current' ? (
        <>
          <PillButton onClick={() => void starter.start(plan.id, workout.id)} loading={starter.isStarting}>
            {workout.inProgress ? copy.list.resumeWorkout : copy.list.startWorkout}
          </PillButton>
          {starter.error && <p className="wk-detail-error">{starter.error}</p>}
        </>
      ) : plan.period === 'upcoming' ? (
        <p className="wk-detail-hint">{copy.list.notStartableYet}</p>
      ) : null
    ) : null;

  return (
    <AppShell bleed surface="soft">
      <div className="wk-detail">
        <div className="wk-detail-top">
          <BackButton variant="disc" />
        </div>

        {isLoading && !plan && <StateMessage>{copy.list.loading}</StateMessage>}
        {error && !plan && <StateMessage onRetry={reload}>{error}</StateMessage>}
        {plan && !workout && <StateMessage>{copy.list.workoutNotFound}</StateMessage>}

        {plan && workout && (
          <>
            <WorkoutDetailHero plan={plan} workout={workout} action={action} />
            {workout.notes && <WorkoutCoachNote text={workout.notes} coachName={coachName} />}
            <WorkoutExerciseCards exercises={workout.exercises} />
          </>
        )}
      </div>
      <StartConflictModal
        active={starter.conflict}
        isBusy={starter.isStarting}
        onClose={starter.closeConflict}
        onResume={starter.resumeActive}
        onDiscardAndStart={() => void starter.discardActiveAndStart()}
      />
    </AppShell>
  );
}
