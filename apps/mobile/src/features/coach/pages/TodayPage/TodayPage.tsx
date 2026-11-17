import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconBell } from '@tabler/icons-react';
import { describeCoachTodoSummary, fill, formatPlural, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { ROUTES, coachThreadPath } from '../../../../app/config/routes';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useMyAvatar } from '../../../../hooks/useMyAvatar';
import { useAuth } from '../../../../services/auth/AuthContext';
import { useUnreadCount } from '../../../notifications/unreadCount';
import { coachCopy } from '../../copy';
import { DEFAULT_TIMEZONE, dayPartAt } from '../../data/coachMode';
import { useCoachToday } from '../../hooks/useCoachToday';
import { type MessageRecipient, useQuickMessage } from '../../hooks/useQuickMessage';
import { QuickMessageSheet } from '../../components/QuickMessageSheet/QuickMessageSheet';
import { CalmCard } from '../../components/CalmCard/CalmCard';
import { CoachAvatar } from '../../components/CoachAvatar/CoachAvatar';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { CoachStage } from '../../components/CoachStage/CoachStage';
import { InviteFirstCard } from '../../components/InviteFirstCard/InviteFirstCard';
import { RecentActivity } from '../../components/RecentActivity/RecentActivity';
import { TodayChips } from '../../components/TodayChips/TodayChips';
import { TodaySection } from '../../components/TodaySection/TodaySection';
import { TodoRow } from '../../components/TodoRow/TodoRow';
import './TodayPage.css';

/** Rows of "דורש טיפול" on Today; "הכול" opens the whole list. */
const TODO_ROWS = 5;

// Coach mode Today, variant A (owner-approved 2026-11-12, docs/design-preview/coach-today-calm.html): "what do I need
// to do now?" — the stage (greeting, one summary line, three chips), "דורש טיפול" (one action list) and recent
// activity. The full feed lives on "כל הפעילות"; the invite on Trainees / Profile (and here for a new coach).
export function TodayPage() {
  const copy = useCopy(coachCopy);
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const { user } = useAuth();
  const avatar = useMyAvatar();
  const unread = useUnreadCount();
  const navigate = useNavigate();
  const { toastMessage, toastAction, showToast } = useToast();
  const onSent = useCallback(
    (recipient: MessageRecipient) =>
      showToast(copy.messages.sent, { label: copy.messages.openThread, onSelect: () => navigate(coachThreadPath(recipient.id)) }),
    [showToast, navigate, copy.messages.sent, copy.messages.openThread],
  );
  const quick = useQuickMessage(onSent);
  const screen = useCoachToday(copy.today.loadError, quick);
  const { today, feed, todo, nowMs } = screen;
  const timezone = user?.timezone ?? DEFAULT_TIMEZONE;
  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] ?? '';
  const data = today.data;

  return (
    <CoachScreen
      inkTop
      top={
        <CoachStage labelledBy="coach-today-greeting">
          <div className="coach-stage-bar">
            <CoachAvatar name={user?.name ?? ''} seed={user?.id ?? ''} photoUrl={avatar.url} onPhotoExpired={avatar.refreshExpired} plain />
            <span className="coach-stage-spacer" />
            <Link
              className="coach-stage-round"
              to={ROUTES.COACH_INBOX}
              aria-label={unread > 0 ? formatPlural(language, copy.today.bellUnread, unread) : copy.today.bell}
            >
              <IconBell size={18} stroke={2} aria-hidden="true" />
              {unread > 0 && <span className="coach-stage-dot" aria-hidden="true" />}
            </Link>
          </div>
          <h1 className="coach-today-greeting display-title" id="coach-today-greeting">
            {fill(copy.today.greeting[dayPartAt(nowMs, timezone)], { name: firstName })}
          </h1>
          {data && screen.hasTrainees && (
            <>
              {/* Counts only the "דורש טיפול" list, never all trainees. */}
              <p className={todo.length > 0 ? 'coach-today-summary' : 'coach-today-summary coach-today-summary-quiet'}>
                {describeCoachTodoSummary(todo.length, language)}
              </p>
              <TodayChips active={data.scoreboard.activeTrainees} waiting={data.scoreboard.waiting} unreadMessages={screen.unreadMessages} />
            </>
          )}
          {today.error && !data && (
            <p className="coach-today-stage-error" role="alert">
              {today.error}
            </p>
          )}
        </CoachStage>
      }
    >
      <div className="coach-today-body">
        {today.error && !data && <StateMessage onRetry={today.reload}>{today.error}</StateMessage>}

        {data && !screen.hasTrainees && <InviteFirstCard />}

        {data && screen.hasTrainees && todo.length === 0 && <CalmCard />}
        {todo.length > 0 && (
          <TodaySection
            title={shared.coachTodo.title}
            link={todo.length > TODO_ROWS ? { label: fill(copy.today.todoAll, { count: todo.length }), to: ROUTES.COACH_TODO } : undefined}
          >
            {todo.slice(0, TODO_ROWS).map((item) => (
              <TodoRow key={item.trainee.id} item={item} onBuildPlan={screen.buildPlan} onMessage={screen.message} />
            ))}
          </TodaySection>
        )}

        {feed.error === 'load' && !feed.items && <StateMessage onRetry={feed.reload}>{copy.today.feedLoadError}</StateMessage>}
        {feed.items && feed.items.length > 0 && <RecentActivity items={feed.items} nowMs={nowMs} />}
      </div>
      <QuickMessageSheet quick={quick} />
      <Toast message={toastMessage} action={toastAction} />
    </CoachScreen>
  );
}
