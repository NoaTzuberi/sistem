import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CoachTodoItem } from '@sistem/shared';
import { buildCoachTodo, useLoad, useServerNow } from '@sistem/shared';
import { OPEN_NEW_PLAN_STATE, coachTraineePath } from '../../../app/config/routes';
import { getCoachToday } from '../../../services/coach/coachService';
import { refreshUnreadCount } from '../../notifications/unreadCount';
import { coachMessageUnread } from '../data/coachUnread';
import { useActivityFeed } from './useActivityFeed';
import type { useQuickMessage } from './useQuickMessage';

/**
 * Coach Today (variant A): the server's day (GET /coach/today) → ONE "דורש טיפול" list (@sistem/shared buildCoachTodo,
 * the dashboard's 48h rule), whose length is the stage's summary; the activity feed for "פעילות אחרונה"; the
 * unread messages chip. Catches up when the app is looked at again (no push yet).
 */
export function useCoachToday(loadError: string, quick: ReturnType<typeof useQuickMessage>) {
  const today = useLoad(getCoachToday, loadError);
  const feed = useActivityFeed();
  const nowMs = useServerNow(today.data?.serverTime);
  const unreadMessages = coachMessageUnread.useCount();
  const navigate = useNavigate();
  const { reload: reloadToday } = today;
  const { reload: reloadFeed } = feed;

  useEffect(() => {
    void refreshUnreadCount();
    function catchUp() {
      reloadToday();
      void reloadFeed();
      void refreshUnreadCount();
    }
    window.addEventListener('focus', catchUp);
    return () => window.removeEventListener('focus', catchUp);
  }, [reloadToday, reloadFeed]);

  const data = today.data;
  const todo = useMemo(() => (data ? buildCoachTodo(data, nowMs) : []), [data, nowMs]);

  // "בניית תוכנית": her Workouts tab opens with "תוכנית חדשה" (building a full plan is the dashboard's).
  const buildPlan = useCallback((traineeId: string) => navigate(coachTraineePath(traineeId, 'workouts'), { state: OPEN_NEW_PLAN_STATE }), [navigate]);
  const message = useCallback(
    (item: CoachTodoItem) => quick.open({ id: item.trainee.id, name: item.trainee.name, avatarUrl: item.trainee.avatar?.url }),
    [quick],
  );

  return {
    today,
    feed,
    nowMs,
    todo,
    unreadMessages,
    hasTrainees: data ? data.scoreboard.activeTrainees + data.scoreboard.waiting > 0 : true,
    buildPlan,
    message,
  };
}
