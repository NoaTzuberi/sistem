import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { dayName, formatWeekRange, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Badge } from '../../../../components/common/Badge/Badge';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { getPlan } from '../../../../services/plans/plansService';
import { workoutLogPath } from '../../../../app/config/routes';
import { Button } from '../../../../components/common/Button/Button';
import { StartConflictModal } from '../../components/StartConflictModal/StartConflictModal';
import { useStartWorkout } from '../../hooks/useStartWorkout';
import { BackButton } from '../../components/BackButton/BackButton';
import { PlanExerciseList } from '../../components/PlanExerciseList/PlanExerciseList';
import { exerciseCountLabel, workoutStatusBadge } from '../../data/workoutDisplay';
import { workoutCopy } from '../../copy';
import { nameScript } from '../../data/weekPlanDisplay';
import './WorkoutDetailPage.css';

// One planned workout (PRD §5.4): exercises, the server's resolved sets and the coach's
// notes, with Start / Resume for this week's workouts (Phase 8).
export function WorkoutDetailPage() {
  const language = useLanguage();
  const copy = useCopy(workoutCopy);
  const { planId = '', workoutId = '' } = useParams();
  const load = useCallback(() => getPlan(planId), [planId]);
  const { data: plan, error, isLoading, reload } = useLoad(load, copy.list.workoutLoadError);
  const workout = plan?.workouts.find((item) => item.id === workoutId);
  const badge = workout && workoutStatusBadge(workout, copy);
  const starter = useStartWorkout();

  return (
    <AppShell>
      <div className="workout-detail">
        <header className="workout-detail-header">
          <BackButton />
          {plan && workout && badge && (
            <div className="workout-detail-heading">
              <h1 className="workout-detail-title">
                <bdi className="display-name" {...nameScript(workout.title)}>
                  {workout.title}
                </bdi>
              </h1>
              <span className="workout-detail-meta">
                {workout.dayOfWeek !== undefined && `${dayName(workout.dayOfWeek, language)} · `}
                {formatWeekRange(plan.weekStartDate, language)} · {exerciseCountLabel(workout.exercises.length, copy, language)}
              </span>
              <Badge variant={badge.variant} className="workout-detail-status">
                {badge.label}
              </Badge>
            </div>
          )}
        </header>

        {isLoading && !plan && <StateMessage>{copy.list.loading}</StateMessage>}
        {error && !plan && <StateMessage onRetry={reload}>{error}</StateMessage>}
        {plan && !workout && <StateMessage>{copy.list.workoutNotFound}</StateMessage>}

        {plan && workout && (
          <>
            {workout.notes && <p className="workout-detail-notes" dir="auto">{workout.notes}</p>}
            <PlanExerciseList exercises={workout.exercises} />
            {workout.logId ? (
              <Link className="workout-detail-log-link" to={workoutLogPath(workout.logId)}>
                {copy.list.viewLog}
              </Link>
            ) : plan.period === 'current' ? (
              <>
                <Button onClick={() => void starter.start(plan.id, workout.id)} loading={starter.isStarting}>
                  {workout.inProgress ? copy.list.resumeWorkout : copy.list.startWorkout}
                </Button>
                {starter.error && <p className="workout-detail-error">{starter.error}</p>}
              </>
            ) : (
              plan.period === 'upcoming' && <p className="workout-detail-hint">{copy.list.notStartableYet}</p>
            )}
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
