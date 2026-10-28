import { useCopy, useServerNow } from '@sistem/shared';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { coachCopy } from '../../copy';
import { useThreads } from '../../hooks/useThreads';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { ThreadRow } from '../../components/ThreadRow/ThreadRow';
import './MessagesPage.css';

/** הודעות: one row per trainee she has a conversation with, newest first. */
export function MessagesPage() {
  const copy = useCopy(coachCopy).messages;
  const { data, error, isLoading, reload } = useThreads();
  const nowMs = useServerNow(data?.serverTime);

  return (
    <CoachScreen
      top={
        <div className="coach-screen-top">
          <div className="coach-screen-title-row">
            <h1 className="coach-screen-title display-title">{copy.title}</h1>
          </div>
        </div>
      }
    >
      {isLoading && !data && null}
      {error && !data && <StateMessage onRetry={reload}>{error}</StateMessage>}
      {data && data.items.length === 0 && <p className="cm-list-empty">{copy.empty}</p>}
      {data && data.items.length > 0 && (
        <ul className="cm-list">
          {data.items.map((thread) => (
            <li key={thread.trainee.id}>
              <ThreadRow thread={thread} nowMs={nowMs} />
            </li>
          ))}
        </ul>
      )}
    </CoachScreen>
  );
}
