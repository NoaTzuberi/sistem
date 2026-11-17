import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { ROUTES, coachThreadPath } from '../../../../app/config/routes';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { appCopy } from '../../../../copy';
import { useAuth } from '../../../../services/auth/AuthContext';
import { coachCopy } from '../../copy';
import { DEFAULT_TIMEZONE, dayMonthOf, weekEyebrow } from '../../data/coachMode';
import { useCoachToday } from '../../hooks/useCoachToday';
import { useReactions } from '../../hooks/useReactions';
import { type MessageRecipient, useQuickMessage } from '../../hooks/useQuickMessage';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed';
import { CoachScreen } from '../../components/CoachScreen/CoachScreen';
import { CoachStage } from '../../components/CoachStage/CoachStage';
import { QuickMessageSheet } from '../../components/QuickMessageSheet/QuickMessageSheet';
import { StageScoreboard } from '../../components/StageScoreboard/StageScoreboard';
import './ActivityPage.css';

// "כל הפעילות" (from Today, variant A): the full feed as Today had it — days, chips, blurred photos, reactions,
// "הודעה", "צפייה בשאלון", "עוד פעילות" — with the week line and the scoreboard on its stage.
// The attention cards are not repeated here: they are Today's "דורש טיפול".
export function ActivityPage() {
  const copy = useCopy(coachCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toastMessage, toastAction, showToast } = useToast();
  const onSent = useCallback(
    (recipient: MessageRecipient) =>
      showToast(copy.messages.sent, { label: copy.messages.openThread, onSelect: () => navigate(coachThreadPath(recipient.id)) }),
    [showToast, navigate, copy.messages.sent, copy.messages.openThread],
  );
  const quick = useQuickMessage(onSent);
  const { today, feed, nowMs } = useCoachToday(copy.today.loadError, quick);
  const reactions = useReactions(useCallback(() => showToast(copy.reactions.error), [showToast, copy.reactions.error]));
  const data = today.data;
  const weekday = data ? eyebrow.weekdays[new Date(`${data.today}T00:00:00Z`).getUTCDay()] : '';

  return (
    <CoachScreen
      inkTop
      top={
        <CoachStage labelledBy="coach-activity-title">
          <div className="coach-stage-bar">
            <Link className="coach-stage-round" to={ROUTES.COACH_TODAY} aria-label={copy.detail.back}>
              <IconChevronLeft className="flip-rtl" size={18} stroke={2.2} aria-hidden="true" />
            </Link>
          </div>
          <h1 className="coach-activity-title display-title" id="coach-activity-title">
            {copy.today.activityTitle}
          </h1>
          {data && (
            <p className="coach-activity-line">
              <Eyebrow keepInEnglish>{`${eyebrow.coach} · ${weekday} ${dayMonthOf(data.today)} · ${weekEyebrow(eyebrow.week, data.weekOfYear)}`}</Eyebrow>
            </p>
          )}
          {data && <StageScoreboard scoreboard={data.scoreboard} />}
        </CoachStage>
      }
    >
      {feed.error === 'load' && !feed.items && <StateMessage onRetry={feed.reload}>{copy.today.feedLoadError}</StateMessage>}
      {feed.items && feed.items.length === 0 && <StateMessage>{copy.today.quietFeed}</StateMessage>}
      {feed.items && feed.items.length > 0 && (
        <ActivityFeed
          items={feed.items}
          attention={[]}
          timezone={user?.timezone ?? DEFAULT_TIMEZONE}
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
