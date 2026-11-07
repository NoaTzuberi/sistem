import { useState } from 'react';
import { IconMessageCircle, IconSearch } from '@tabler/icons-react';
import { searchByText, useCopy, useServerNow } from '@sistem/shared';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { coachCopy } from '../../copy';
import { useThreads } from '../../hooks/useThreads';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { ThreadRow } from '../../components/ThreadRow/ThreadRow';
import './MessagesPage.css';

/** הודעות: one row per trainee she has a conversation with, newest first; the search filters by her name. */
export function MessagesPage() {
  const coach = useCopy(coachCopy);
  const copy = coach.messages;
  const { data, error, isLoading, reload } = useThreads();
  const nowMs = useServerNow(data?.serverTime);
  const [search, setSearch] = useState('');
  const items = data?.items ?? [];
  const visible = searchByText(items, search, (thread) => thread.trainee.name);

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
      {data && items.length === 0 && (
        <div className="cm-list-empty-state">
          <span className="cm-empty-icon" aria-hidden="true">
            <IconMessageCircle size={26} />
          </span>
          <p className="cm-list-empty">{copy.empty}</p>
        </div>
      )}
      {items.length > 0 && (
        <>
          <label className="cm-search">
            <IconSearch size={18} aria-hidden="true" />
            <input
              className="cm-search-input"
              type="search"
              enterKeyHint="search"
              placeholder={coach.list.searchPlaceholder}
              aria-label={coach.list.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              dir="auto"
            />
          </label>
          {visible.length === 0 ? (
            <StateMessage>{coach.list.noMatch}</StateMessage>
          ) : (
            <ul className="cm-list">
              {visible.map((thread) => (
                <li key={thread.trainee.id}>
                  <ThreadRow thread={thread} nowMs={nowMs} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </CoachScreen>
  );
}
