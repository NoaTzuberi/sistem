import { useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconBell } from '@tabler/icons-react';
import { fill, formatPlural, useCopy, useLanguage, useLoad, useServerNow } from '@sistem/shared';
import { ROUTES, coachThreadPath, coachTraineesPath } from '../../../../app/config/routes';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { useMyAvatar } from '../../../../hooks/useMyAvatar';
import { useAuth } from '../../../../services/auth/AuthContext';
import { getCoachToday } from '../../../../services/coach/coachService';
import { refreshUnreadCount, useUnreadCount } from '../../../notifications/unreadCount';
import { coachCopy } from '../../copy';
import { DEFAULT_TIMEZONE, dayMonthOf, dayPartAt, weekEyebrow } from '../../data/coachMode';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { useReactions } from '../../hooks/useReactions';
import { type MessageRecipient, useQuickMessage } from '../../hooks/useQuickMessage';
import { QuickMessageSheet } from '../../components/QuickMessageSheet/QuickMessageSheet';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed';
import { CoachAvatar } from '../../components/CoachAvatar/CoachAvatar';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { CoachStage } from '../../components/CoachStage/CoachStage';
import { InvitePill } from '../../components/InvitePill/InvitePill';
import { StageScoreboard } from '../../components/StageScoreboard/StageScoreboard';
import { WaitingCarousel } from '../../components/WaitingCarousel/WaitingCarousel';
import './TodayPage.css';

// Coach mode Today (docs/design/coach-app.html): the ink stage (greeting, scoreboard), the waiting
// carousel and the activity feed. Every number and the attention rule are the server's (GET /coach/today).
export function TodayPage() {
  const copy = useCopy(coachCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();
  const { user } = useAuth();
  const avatar = useMyAvatar();
  const unread = useUnreadCount();
  const today = useLoad(getCoachToday, copy.today.loadError);
  const feed = useActivityFeed();
  const nowMs = useServerNow(today.data?.serverTime);
  const timezone = user?.timezone ?? DEFAULT_TIMEZONE;
  const name = user?.name ?? '';
  const firstName = name.trim().split(/\s+/)[0] ?? '';
  const { reload: reloadToday } = today;
  const { reload: reloadFeed } = feed;
  const navigate = useNavigate();
  const { toastMessage, toastAction, showToast } = useToast();
  const reactions = useReactions(useCallback(() => showToast(copy.reactions.error), [showToast, copy.reactions.error]));
  const onSent = useCallback(
    (recipient: MessageRecipient) =>
      showToast(copy.messages.sent, { label: copy.messages.openThread, onSelect: () => navigate(coachThreadPath(recipient.id)) }),
    [showToast, navigate, copy.messages.sent, copy.messages.openThread],
  );
  const quick = useQuickMessage(onSent);

  // Catch up when the app is looked at again (no push yet).
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
  const weekday = data ? eyebrow.weekdays[new Date(`${data.today}T00:00:00Z`).getUTCDay()] : '';
  const hasTrainees = data ? data.scoreboard.activeTrainees + data.scoreboard.waiting > 0 : true;
  const isEmpty = feed.items !== undefined && feed.items.length === 0 && (data?.attention.length ?? 0) === 0;

  return (
    <CoachScreen
      top={
        <CoachStage labelledBy="coach-today-greeting">
          <div className="coach-stage-bar">
            <CoachAvatar name={name} seed={user?.id ?? ''} photoUrl={avatar.url} onPhotoExpired={avatar.refreshExpired} plain />
            <span className="coach-stage-spacer" />
            <Link
              className="coach-stage-round"
              to={ROUTES.COACH_INBOX}
              aria-label={unread > 0 ? formatPlural(language, copy.today.bellUnread, unread) : copy.today.bell}
            >
              <IconBell size={18} stroke={2} aria-hidden="true" />
              {unread > 0 && <span className="coach-stage-dot" aria-hidden="true" />}
            </Link>
            <InvitePill />
          </div>
          <h1 className="coach-today-greeting display-title" id="coach-today-greeting">
            {fill(copy.today.greeting[dayPartAt(nowMs, timezone)], { name: firstName })}
          </h1>
          {data && (
            <p className="coach-today-line">
              <Eyebrow keepInEnglish>{`${eyebrow.coach} · ${weekday} ${dayMonthOf(data.today)} · ${weekEyebrow(eyebrow.week, data.weekOfYear)}`}</Eyebrow>
            </p>
          )}
          {data && <StageScoreboard scoreboard={data.scoreboard} />}
          {today.error && !data && (
            <p className="coach-today-stage-error" role="alert">
              {today.error}
            </p>
          )}
        </CoachStage>
      }
    >
      {data && data.waiting.length > 0 && (
        <section aria-labelledby="coach-today-waiting">
          <div className="coach-section-head">
            <Eyebrow>{eyebrow.waiting}</Eyebrow>
            <h2 className="coach-section-title" id="coach-today-waiting">
              {copy.today.waitingTitle}
            </h2>
            <Link className="coach-link" to={coachTraineesPath('waiting')}>
              {copy.today.seeAll}
            </Link>
          </div>
          <WaitingCarousel trainees={data.waiting} nowMs={nowMs} />
        </section>
      )}

      {today.error && !data && <StateMessage onRetry={reloadToday}>{today.error}</StateMessage>}
      {feed.error === 'load' && !feed.items && <StateMessage onRetry={reloadFeed}>{copy.today.feedLoadError}</StateMessage>}

      {isEmpty && data && (
        <div className="coach-today-empty">
          <p className="coach-today-empty-text">{hasTrainees ? copy.today.quietFeed : copy.today.emptyFeed}</p>
          {!hasTrainees && <InvitePill />}
        </div>
      )}

      {feed.items && !isEmpty && (
        <ActivityFeed
          items={feed.items}
          attention={data?.attention ?? []}
          timezone={timezone}
          nowMs={nowMs}
          hasMore={feed.hasMore}
          isLoadingMore={feed.isLoadingMore}
          loadMoreError={feed.error === 'loadMore'}
          onLoadMore={() => void feed.loadMore()}
          reactionOf={reactions.reactionOf}
          onReact={(item, reaction) => void reactions.toggle(item, reaction)}
          onMessage={(trainee) => quick.open({ id: trainee.id, name: trainee.name, avatarUrl: trainee.avatar?.url })}
        />
      )}
      <QuickMessageSheet quick={quick} />
      <Toast message={toastMessage} action={toastAction} />
    </CoachScreen>
  );
}
