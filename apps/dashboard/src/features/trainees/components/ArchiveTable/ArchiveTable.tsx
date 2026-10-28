import { useNavigate } from 'react-router-dom';
import type { CoachArchivedTrainee } from '@sistem/types';
import { formatDate, formatTimeAgo, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { archivedTraineePath } from '../../../../app/config/routes';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { traineesCopy } from '../../copy';
import './ArchiveTable.css';

interface ArchiveTableProps {
  items: CoachArchivedTrainee[];
  nowMs: number;
}

/** The archive filter's table: ended coachings (initials only — no photos after the end). A row opens her read-only page. */
export function ArchiveTable({ items, nowMs }: ArchiveTableProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const navigate = useNavigate();

  return (
    <table className="trainees-table archive-table">
      <thead>
        <tr>
          <th scope="col">{copy.trainee}</th>
          <th scope="col">{shared.coach.archive.endedColumn}</th>
          <th scope="col">{shared.coach.lastActivity}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((trainee) => {
          const onOpen = () => navigate(archivedTraineePath(trainee.id));
          return (
            <tr
              key={trainee.id}
              className="trainees-row"
              tabIndex={0}
              onClick={onOpen}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.target === event.currentTarget) onOpen();
              }}
            >
              <td>
                <span className="trainees-person">
                  <Avatar name={trainee.name} seed={trainee.id} />
                  <span className="trainees-person-text">
                    <b className="trainees-name archive-table-name">
                      <bdi>{trainee.name}</bdi>
                    </b>
                    <span className="trainees-details" dir="ltr">
                      {trainee.email}
                    </span>
                  </span>
                </span>
              </td>
              <td>{formatDate(trainee.coachingEndedAt, language)}</td>
              <td className="trainees-muted">{trainee.lastCompletedAt ? formatTimeAgo(trainee.lastCompletedAt, nowMs, language) : shared.common.none}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
