import { Link } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Button } from '../../../../components/common/Button/Button';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useUnreadCount } from '../../../notifications/unreadCount';
import { ROUTES } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import { InboxRow } from '../../components/InboxRow/InboxRow';
import { useCoachInbox } from '../../hooks/useCoachInbox';
import './InboxPage.css';

// Coach mode notifications (PRD §6, behind Today's bell): the dashboard bell's look and wording.
// Push (Phase 5b) will open the same targets.
export function InboxPage() {
  const shared = useCopy(sharedCopy);
  const copy = shared.coach.inbox;
  const coachText = useCopy(coachCopy);
  const language = useLanguage();
  const unreadCount = useUnreadCount();
  const inbox = useCoachInbox(language);

  return (
    <AppShell>
      <div className="coach-inbox">
        <header className="coach-inbox-header">
          <Link className="coach-inbox-back" to={ROUTES.COACH_TODAY} aria-label={coachText.detail.back}>
            <IconChevronLeft className="flip-rtl" size={24} aria-hidden="true" />
          </Link>
          <h1 className="coach-inbox-title display-title">{copy.notificationsTitle}</h1>
          <button className="coach-inbox-read-all" type="button" disabled={unreadCount === 0} onClick={() => void inbox.markAll()}>
            {copy.markAllRead}
          </button>
        </header>

        {inbox.error && (
          <StateMessage onRetry={inbox.loadFirstPage}>
            {inbox.error === 'load' ? copy.bellLoadError : inbox.error === 'loadMore' ? copy.loadMoreError : copy.markReadError}
          </StateMessage>
        )}
        {inbox.isLoading && <StateMessage>{shared.common.loading}</StateMessage>}
        {!inbox.error && inbox.isEmpty && <p className="coach-inbox-empty">{copy.empty}</p>}

        {inbox.groups.map((group) => (
          <section key={group.id} className="coach-inbox-group" aria-labelledby={`coach-inbox-${group.id}`}>
            <h2 className="coach-inbox-group-title" id={`coach-inbox-${group.id}`}>
              {group.title}
            </h2>
            <ul className="coach-inbox-list">
              {group.rows.map((row) => (
                <InboxRow key={row.id} row={row} unreadLabel={copy.unread} onOpen={inbox.open} />
              ))}
            </ul>
          </section>
        ))}

        {inbox.nextCursor && (
          <Button variant="secondary" className="coach-inbox-more" loading={inbox.isLoadingMore} onClick={() => void inbox.loadMore()}>
            {copy.loadMore}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
