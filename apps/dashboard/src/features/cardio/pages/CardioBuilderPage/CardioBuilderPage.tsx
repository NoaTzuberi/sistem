import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sharedCopy, useCopy, useLoad } from '@sistem/shared';
import { planPath } from '../../../../app/config/routes';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { getTrainee, listPlans } from '../../../../services/coach/coachService';
import { getTraineeCardioSession } from '../../../../services/cardio/cardioService';
import { CardioBuilder } from '../../components/CardioBuilder/CardioBuilder';
import { cardioCopy } from '../../copy';
import './CardioBuilderPage.css';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Week N of her program: week 1 is the week of her first plan (as on the Plans tab). */
function programWeek(weekStarts: string[], weekStart: string): number {
  const first = [...weekStarts].sort()[0] ?? weekStart;
  return Math.round((Date.parse(`${weekStart}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / (7 * DAY_MS)) + 1;
}

/** Loads the plan week, the trainee and (when editing) the session, then hands them to the builder. */
export function CardioBuilderPage() {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(cardioCopy);
  const { traineeId = '', planId = '', sessionId } = useParams();
  const load = useCallback(async () => {
    const [plans, { trainee }, session] = await Promise.all([
      listPlans(traineeId),
      getTrainee(traineeId),
      sessionId ? getTraineeCardioSession(traineeId, sessionId) : Promise.resolve(null),
    ]);
    const plan = plans.find((item) => item.id === planId);
    if (!plan) throw new Error('plan_not_found');
    return { plan, trainee, session, weekNumber: programWeek(plans.map((item) => item.weekStartDate), plan.weekStartDate) };
    // The session id is read once: after the first save the builder moves to its own address itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId, planId]);
  const { data, error, isLoading, reload } = useLoad(load, copy.loadError);

  if (!data) {
    return (
      <div className="cb-page-state">
        <Link to={planPath(traineeId, planId)}>{copy.back}</Link>
        {isLoading && <p>{shared.common.loading}</p>}
        {error && (
          <p role="alert">
            {error} <PillButton size="sm" onClick={reload}>{shared.common.retry}</PillButton>
          </p>
        )}
      </div>
    );
  }

  return (
    <CardioBuilder traineeId={traineeId} traineeName={data.trainee.name} plan={data.plan} weekNumber={data.weekNumber} session={data.session} />
  );
}
