import { Link } from 'react-router-dom';
import type { CoachArchivedTrainee } from '@sistem/types';
import { fill, formatDate, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { coachArchivedTraineePath } from '../../../../app/config/routes';
import { traineeColorClass } from '../../data/coachMode';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import '../TraineeRow/TraineeRow.css';
import './ArchivedTraineeRow.css';

/** An archive row: initials (no photo after the end), name, when the coaching ended. Opens the read-only page. */
export function ArchivedTraineeRow({ trainee }: { trainee: CoachArchivedTrainee }) {
  const copy = useCopy(sharedCopy).coach.archive;
  const language = useLanguage();
  return (
    <Link className={`trainee-row archived-trainee-row ${traineeColorClass(trainee.id)}`} to={coachArchivedTraineePath(trainee.id)}>
      <CoachAvatar name={trainee.name} seed={trainee.id} size="lg" />
      <span className="trainee-row-body">
        <bdi className="trainee-row-name display-title">{trainee.name}</bdi>
        <span className="trainee-row-line">{fill(copy.endedOn, { date: formatDate(trainee.coachingEndedAt, language) })}</span>
      </span>
    </Link>
  );
}
