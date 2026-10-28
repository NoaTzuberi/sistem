import { Link } from 'react-router-dom';
import type { CoachThread } from '@sistem/types';
import { fill, formatTimeAgo, useCopy, useLanguage } from '@sistem/shared';
import { coachThreadPath } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import './ThreadRow.css';

/** A Messages tab row: avatar, name, the last message (one line), its time and the unread dot. */
export function ThreadRow({ thread, nowMs }: { thread: CoachThread; nowMs: number }) {
  const copy = useCopy(coachCopy).messages;
  const language = useLanguage();
  const { trainee, lastMessage } = thread;
  const preview = lastMessage.sender === 'coach' ? fill(copy.youPrefix, { text: lastMessage.text }) : lastMessage.text;
  return (
    <Link className={'cm-row' + (thread.unread > 0 ? ' cm-row-unread' : '')} to={coachThreadPath(trainee.id)}>
      <CoachAvatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} size="lg" />
      <span className="cm-row-body">
        <bdi className="cm-row-name">{trainee.name}</bdi>
        <span className="cm-row-text" dir="auto">
          {preview}
        </span>
      </span>
      <time className="cm-row-time" dateTime={lastMessage.createdAt}>
        {formatTimeAgo(lastMessage.createdAt, nowMs, language)}
      </time>
      {thread.unread > 0 && <span className="cm-row-dot" role="img" aria-label={copy.unread} />}
    </Link>
  );
}
