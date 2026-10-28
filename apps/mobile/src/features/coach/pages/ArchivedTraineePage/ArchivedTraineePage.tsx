import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { fill, formatDate, sharedCopy, useCopy, useLanguage, useLoad } from '@sistem/shared';
import { coachTraineesPath } from '../../../../app/config/routes';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { getArchivedTrainee, listArchivedWorkoutLogs } from '../../../../services/coach/coachService';
import { coachCopy } from '../../copy';
import { CoachAvatar } from '../../components/CoachAvatar/CoachAvatar';
import { CoachCard } from '../../components/CoachCard/CoachCard';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { CoachStage } from '../../components/CoachStage/CoachStage';
import { QuestionnaireCard } from '../../components/QuestionnaireCard/QuestionnaireCard';
import { WorkoutLogList } from '../../components/WorkoutLogList/WorkoutLogList';
import '../TraineeDetailPage/TraineeDetailPage.css';
import './ArchivedTraineePage.css';

// Coach mode: a trainee whose coaching ended — read-only. The server sends only that coaching's records
// from before the end, without photos (coach/coachArchive.service); a trainee back with a new invite is a 404 here.
export function ArchivedTraineePage() {
  const { traineeId = '' } = useParams();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(coachCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();
  const load = useCallback(() => getArchivedTrainee(traineeId), [traineeId]);
  const { data, error, isLoading, reload } = useLoad(load, shared.coach.loadTraineeError);
  const loadLogs = useCallback(() => listArchivedWorkoutLogs(traineeId), [traineeId]);
  const trainee = data?.trainee;
  const archive = shared.coach.archive;

  return (
    <CoachScreen
      top={
        <CoachStage labelledBy="coach-archived-name">
          <div className="coach-stage-bar">
            <Link className="coach-stage-round" to={coachTraineesPath('archive')} aria-label={copy.detail.back}>
              <IconChevronLeft className="flip-rtl" size={18} stroke={2.2} aria-hidden="true" />
            </Link>
            <span className="coach-stage-spacer" />
            <Eyebrow keepInEnglish>{eyebrow.trainee}</Eyebrow>
          </div>
          {trainee && (
            <div className="coach-trainee-id">
              <CoachAvatar name={trainee.name} seed={trainee.id} size="xl" />
              <div className="coach-trainee-id-text">
                <h1 className="coach-trainee-name display-title" id="coach-archived-name">
                  <bdi>{trainee.name}</bdi>
                </h1>
                <p className="coach-trainee-sub">{fill(archive.endedOn, { date: formatDate(trainee.coachingEndedAt, language) })}</p>
              </div>
            </div>
          )}
        </CoachStage>
      }
    >
      {isLoading && !trainee && <StateMessage>{shared.common.loading}</StateMessage>}
      {error && !trainee && <StateMessage onRetry={reload}>{error}</StateMessage>}

      {trainee && (
        <div className="archived-trainee">
          <p className="archived-trainee-note">{archive.readOnly}</p>
          <CoachCard title={archive.workouts}>
            <WorkoutLogList traineeId={trainee.id} load={loadLogs} />
          </CoachCard>
          <QuestionnaireCard onboarding={trainee.onboarding} />
        </div>
      )}
    </CoachScreen>
  );
}
