import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AppNotification } from '@sistem/types';
import { describeCoachNotification, formatDateTime, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Button } from '../../../../components/common/Button/Button';
import { listNotifications, markAllRead, markRead } from '../../../../services/notifications/notificationsService';
import { refreshUnreadCount, setUnreadCount, useUnreadCount } from '../../../notifications/unreadCount';
import { ROUTES, coachTraineePath } from '../../../../app/config/routes';
import { traineeTabOf } from '../../data/traineeTabs';
import { coachCopy } from '../../copy';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import './InboxPage.css';

const PAGE_SIZE = 20;

// Coach mode Inbox (PRD §6): the in-app notifications of Phase 5a. Push (Phase 5b)
// will open the same targets.
export function InboxPage() {
  const shared = useCopy(sharedCopy);
  const copy = shared.coach.inbox;
  const coachText = useCopy(coachCopy);
  const language = useLanguage();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const [items, setItems] = useState<AppNotification[]>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // A key, so the message follows the language on screen.
  const [error, setError] = useState<'load' | 'loadMore' | 'markRead'>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadFirstPage = useCallback(async () => {
    try {
      const list = await listNotifications({ limit: PAGE_SIZE });
      setItems(list.items);
      setNextCursor(list.nextCursor);
      setUnreadCount(list.unreadCount);
      setError(undefined);
    } catch {
      setError('load');
    }
  }, []);

  // Catch up when the app is looked at again (no push yet).
  useEffect(() => {
    void loadFirstPage();
    window.addEventListener('focus', loadFirstPage);
    return () => window.removeEventListener('focus', loadFirstPage);
  }, [loadFirstPage]);

  async function handleLoadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try {
      const list = await listNotifications({ limit: PAGE_SIZE, before: nextCursor });
      setItems((current) => [...(current ?? []), ...list.items]);
      setNextCursor(list.nextCursor);
      setError(undefined);
    } catch {
      setError('loadMore');
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleOpen(notification: AppNotification, traineeId: string, section: 'logs' | null) {
    navigate(coachTraineePath(traineeId, section ? traineeTabOf(section) : null));
    if (notification.readAt) return;
    markRead(notification.id)
      .catch(() => undefined)
      .finally(refreshUnreadCount);
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead();
      setUnreadCount(0);
      setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch {
      setError('markRead');
    }
  }

  const visible = (items ?? []).flatMap((notification) => {
    const described = describeCoachNotification(notification, language);
    return described ? [{ notification, ...described }] : [];
  });

  return (
    <AppShell>
      <div className="coach-inbox">
        <header className="coach-inbox-header">
          <Link className="coach-inbox-back" to={ROUTES.COACH_TODAY} aria-label={coachText.detail.back}>
            <IconChevronLeft className="flip-rtl" size={24} aria-hidden="true" />
          </Link>
          <h1 className="coach-inbox-title">{copy.title}</h1>
          <button className="coach-inbox-read-all" type="button" disabled={unreadCount === 0} onClick={handleMarkAllRead}>
            {copy.markAllRead}
          </button>
        </header>

        {error && (
          <StateMessage onRetry={loadFirstPage}>
            {error === 'load' ? copy.loadError : error === 'loadMore' ? copy.loadMoreError : copy.markReadError}
          </StateMessage>
        )}
        {!error && !items && <StateMessage>{shared.common.loading}</StateMessage>}
        {!error && items && visible.length === 0 && <StateMessage>{copy.empty}</StateMessage>}

        <ul className="coach-inbox-list">
          {visible.map(({ notification, text, traineeId, section }) => (
            <li key={notification.id}>
              <button
                className={notification.readAt ? 'coach-inbox-item' : 'coach-inbox-item coach-inbox-item-unread'}
                type="button"
                onClick={() => handleOpen(notification, traineeId, section)}
              >
                <span className="coach-inbox-dot" aria-hidden="true" />
                <span className="coach-inbox-item-main">
                  <span className="coach-inbox-item-text">
                    {text}
                    {!notification.readAt && <span className="coach-inbox-unread-label">{copy.unread}</span>}
                  </span>
                  <span className="coach-inbox-item-time">{formatDateTime(notification.createdAt, language)}</span>
                </span>
                <IconChevronRight className="flip-rtl coach-inbox-chevron" size={20} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        {nextCursor && (
          <Button variant="secondary" className="coach-inbox-more" loading={isLoadingMore} onClick={handleLoadMore}>
            {copy.loadMore}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
