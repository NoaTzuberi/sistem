import type { CoachTraineeSummary } from '@sistem/types';
import { fill, formatTimeLeft, useCopy, useLanguage } from '@sistem/shared';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { isPlanWindowUrgent } from '../../../trainees/data/traineeFacts';
import { overviewCopy } from '../../copy';
import './WaitingList.css';

interface WaitingListProps {
  /** Trainees waiting for their first plan, least time left first. */
  trainees: CoachTraineeSummary[];
  /** The server's clock — the 48h window counts against it. */
  nowMs: number;
  onOpen: (traineeId: string) => void;
}

const MAX_ROWS = 3;

/** Glass rows on the "waiting" hero: who, and how long is left on her 48h window. */
export function WaitingList({ trainees, nowMs, onOpen }: WaitingListProps) {
  const language = useLanguage();
  const copy = useCopy(overviewCopy);
  const shown = trainees.slice(0, MAX_ROWS);
  const hidden = trainees.length - shown.length;

  return (
    <div className="waiting-list">
      {shown.map((trainee) => (
        <button key={trainee.id} className="waiting-row" type="button" aria-haspopup="dialog" onClick={() => onOpen(trainee.id)}>
          <Avatar name={trainee.name} seed={trainee.id} size="sm" photoUrl={trainee.avatar?.url} />
          <b className="waiting-name">
            <bdi>{trainee.name}</bdi>
          </b>
          {trainee.planDueAt && (
            <span className={isPlanWindowUrgent(trainee.planDueAt, nowMs) ? 'waiting-left waiting-left-urgent' : 'waiting-left'}>
              {formatTimeLeft(trainee.planDueAt, nowMs, language).text}
            </span>
          )}
        </button>
      ))}
      {hidden > 0 && <p className="waiting-more">{fill(copy.waiting.more, { count: hidden })}</p>}
    </div>
  );
}
