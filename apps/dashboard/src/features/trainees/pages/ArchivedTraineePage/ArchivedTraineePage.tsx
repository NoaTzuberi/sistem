import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fill, formatDate, sharedCopy, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { currentWeekStartOf } from '../../data/archiveDisplay';
import { traineesPath } from '../../../../app/config/routes';
import { getArchivedTrainee, listArchivedWorkoutLogs } from '../../../../services/coach/coachService';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';
import { TabCard } from '../../components/TabCard/TabCard';
import { OnboardingAnswers } from '../../components/OnboardingAnswers/OnboardingAnswers';
import { WorkoutLogList } from '../../components/WorkoutLogList/WorkoutLogList';
import { traineesCopy } from '../../copy';
import '../TraineeDetailPage/TraineeDetailPage.css';
import './ArchivedTraineePage.css';

/**
 * A trainee whose coaching ended — read-only. The server sends only that coaching's records from before
 * the end, without photos (coach/coachArchive.service). Coming back takes a new invite.
 */
export function ArchivedTraineePage() {
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const language = useLanguage();
  const { traineeId = '' } = useParams();
  const load = useCallback(() => getArchivedTrainee(traineeId), [traineeId]);
  const { data, error, isLoading, reload } = useLoad(load, shared.coach.loadTraineeError);
  const loadLogs = useCallback(() => listArchivedWorkoutLogs(traineeId), [traineeId]);
  const trainee = data?.trainee;
  const archive = shared.coach.archive;

  return (
    <div className="trainee-detail">
      <Link className="trainee-back" to={traineesPath('archive')}>
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
        <div className="archived-trainee">
          <header className="archived-trainee-header">
            <Avatar name={trainee.name} seed={trainee.id} size="lg" />
            <div className="archived-trainee-identity">
              <h1 className="archived-trainee-name">
                <bdi>{trainee.name}</bdi>
              </h1>
              <p className="archived-trainee-meta">
                {fill(archive.endedOn, { date: formatDate(trainee.coachingEndedAt, language) })}
                <span dir="ltr">{trainee.email}</span>
              </p>
              <p className="archived-trainee-note">{archive.readOnly}</p>
            </div>
          </header>

          <TabCard title={archive.workouts}>
            <WorkoutLogList
              traineeId={trainee.id}
              timezone={trainee.timezone}
              currentWeekStart={currentWeekStartOf(trainee.coachingEndedAt, trainee.timezone)}
              load={loadLogs}
            />
          </TabCard>
          <OnboardingAnswers traineeId={trainee.id} onboarding={trainee.onboarding} />
        </div>
      )}
    </div>
  );
}
