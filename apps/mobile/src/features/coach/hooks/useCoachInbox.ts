import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification, CoachTraineeSummary, Language } from '@sistem/types';
import { describeCoachNotification, describeCoachNotificationSub, formatTimeAgo, notificationDayGroup, sharedCopy, useServerNow } from '@sistem/shared';
import type { CoachNotificationView, NotificationDayGroup } from '@sistem/shared';
import { listNotifications, markAllRead, markRead } from '../../../services/notifications/notificationsService';
import { listTrainees } from '../../../services/coach/coachService';
import { refreshUnreadCount, setUnreadCount } from '../../notifications/unreadCount';
import { coachArchivedTraineePath, coachTraineePath } from '../../../app/config/routes';
import { traineeTabOf } from '../data/traineeTabs';

const PAGE_SIZE = 20;
const MINUTE_MS = 60_000;
const GROUP_ORDER: NotificationDayGroup[] = ['today', 'yesterday', 'earlier'];

export interface InboxRow {
  id: string;
  view: CoachNotificationView;
  sub?: string;
  time: string;
  isUnread: boolean;
  notification: AppNotification;
}

export interface InboxGroup {
  id: NotificationDayGroup;
  title: string;
  rows: InboxRow[];
}

/** "now" under a minute, then "5 minutes ago" / "3 hours ago" / "2 days ago" (shared wording). */
function rowTime(iso: string, nowMs: number, language: Language): string {
  return nowMs - new Date(iso).getTime() < MINUTE_MS ? sharedCopy[language].coach.inbox.now : formatTimeAgo(iso, nowMs, language);
}

/**
 * Coach mode's notifications (Phase 5a in-app): pages from the server, the same sentence / icon / color /
 * sub line / target as the dashboard bell (@sistem/shared), grouped today / yesterday / earlier.
 * Opening or "mark all" keeps the dock / bell count in sync.
 */
export function useCoachInbox(language: Language) {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // A key, so the message follows the language on screen.
  const [error, setError] = useState<'load' | 'loadMore' | 'markRead'>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [trainees, setTrainees] = useState<CoachTraineeSummary[]>([]);
  const [serverTime, setServerTime] = useState<string>();
  const nowMs = useServerNow(serverTime);

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
    // The sub lines ("waiting for a plan", her week) only; without them the rows still show.
    try {
      const list = await listTrainees();
      setTrainees(list.items);
      setServerTime(list.serverTime);
    } catch {
      setTrainees([]);
    }
  }, []);

  // Catch up when the app is looked at again (no push yet).
  useEffect(() => {
    void loadFirstPage();
    window.addEventListener('focus', loadFirstPage);
    return () => window.removeEventListener('focus', loadFirstPage);
  }, [loadFirstPage]);

  async function loadMore() {
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

  function open(row: InboxRow) {
    const { traineeId, section } = row.view;
    navigate(section === 'archive' ? coachArchivedTraineePath(traineeId) : coachTraineePath(traineeId, section ? traineeTabOf(section) : null));
    if (!row.isUnread) return;
    markRead(row.id)
      .catch(() => undefined)
      .finally(refreshUnreadCount);
  }

  async function markAll() {
    try {
      await markAllRead();
      setUnreadCount(0);
      setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch {
      setError('markRead');
    }
  }

  const groups = useMemo<InboxGroup[]>(() => {
    const byId = new Map(trainees.map((trainee) => [trainee.id, trainee]));
    const context = {
      nowMs,
      isWaiting: (id: string) => byId.get(id)?.status === 'waiting',
      weekOf: (id: string) => byId.get(id)?.thisWeek,
    };
    const titles = sharedCopy[language].coach.inbox;
    const groupTitle = { today: titles.groupToday, yesterday: titles.groupYesterday, earlier: titles.groupEarlier };
    const rows = (items ?? []).flatMap((notification) => {
      const view = describeCoachNotification(notification, language);
      if (!view) return [];
      const row: InboxRow = {
        id: notification.id,
        view,
        sub: describeCoachNotificationSub(notification, view.traineeId, context, language),
        time: rowTime(notification.createdAt, nowMs, language),
        isUnread: notification.readAt === null,
        notification,
      };
      return [{ row, group: notificationDayGroup(notification.createdAt, nowMs) }];
    });
    return GROUP_ORDER.map((id) => ({ id, title: groupTitle[id], rows: rows.filter((entry) => entry.group === id).map((entry) => entry.row) })).filter(
      (group) => group.rows.length > 0,
    );
  }, [items, trainees, nowMs, language]);

  return { isLoading: !items && !error, isEmpty: Boolean(items) && groups.length === 0, groups, error, nextCursor, isLoadingMore, loadFirstPage, loadMore, open, markAll };
}
