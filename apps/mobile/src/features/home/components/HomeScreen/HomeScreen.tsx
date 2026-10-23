import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconCalendarEvent } from '@tabler/icons-react';
import { fill, formatWeekRange, useCopy, useLanguage } from '@sistem/shared';
import { ROUTES, workoutSessionPath } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { useFreeWorkout } from '../../../workouts/hooks/useFreeWorkout';
import { FreeWorkoutSheet } from '../../../workouts/components/FreeWorkoutSheet/FreeWorkoutSheet';
import { SgStageAction } from '../SgStageAction/SgStageAction';
import { JoinCoachCard } from '../JoinCoachCard/JoinCoachCard';
import { useJoinCardDismissal } from '../../hooks/useJoinCardDismissal';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { appCopy } from '../../../../copy';
import { useStartWorkout } from '../../../workouts/hooks/useStartWorkout';
import { StartConflictModal } from '../../../workouts/components/StartConflictModal/StartConflictModal';
import { useHomeData } from '../../hooks/useHomeData';
import { useWeekTrack } from '../../hooks/useWeekTrack';
import { useCoachThanks } from '../../hooks/useCoachThanks';
import { homeCopy } from '../../copy';
import { HomeStage } from '../HomeStage/HomeStage';
import { StartingPhotoPrompt } from '../StartingPhotoPrompt/StartingPhotoPrompt';
import { WeekTrack } from '../WeekTrack/WeekTrack';
import { WeekDayDetail } from '../WeekDayDetail/WeekDayDetail';
import { Scoreboard } from '../Scoreboard/Scoreboard';
import { IntervalTimerEntry } from '../IntervalTimerEntry/IntervalTimerEntry';
import { CoachNote } from '../CoachNote/CoachNote';
import type { QuickReply } from '../QuickReplies/QuickReplies';
import { NextAchievement } from '../NextAchievement/NextAchievement';
import { MiniAchievements } from '../MiniAchievements/MiniAchievements';
import { FuelToday } from '../FuelToday/FuelToday';
import './HomeScreen.css';

/**
 * Trainee Home, direction B (docs/design/trainee-home-b.html; PRD §5.1). Every status and number comes
 * from the server (her zone, her data); a section without data is not drawn — nothing is made up.
 */
export function HomeScreen() {
  const copy = useCopy(homeCopy);
  const eyebrow = useCopy(appCopy).eyebrow;
  const language = useLanguage();
  const navigate = useNavigate();
  const home = useHomeData();
  const starter = useStartWorkout();
  const { week, stage, activeLog } = home;
  const data = week.data;
  const track = useWeekTrack(data);
  const coachMessage = home.coachMessage;
  const thanks = useCoachThanks(coachMessage ? { id: coachMessage.note, key: coachMessage.key } : null);
  // Self-guided (no live coaching) or a coach she joined later still building the plan: her own tools.
  const coachingStatus = home.user?.coachingStatus ?? null;
  const [isFreeOpen, setIsFreeOpen] = useState(false);
  const free = useFreeWorkout(isFreeOpen);
  const joinCard = useJoinCardDismissal(home.user?.id);
  const { toastMessage, showToast } = useToast();
  const location = useLocation();
  const joinedCoach = (location.state as { joinedCoach?: string } | null)?.joinedCoach;

  // Back from joining a coach (Profile / this card): say so once, then forget it.
  useEffect(() => {
    if (!joinedCoach) return;
    showToast(fill(copy.selfGuided.joined, { coach: joinedCoach }));
    navigate(location.pathname, { replace: true, state: null });
  }, [copy.selfGuided.joined, joinedCoach, location.pathname, navigate, showToast]);

  function openFree() {
    free.reset();
    setIsFreeOpen(true);
  }

  const noPlanContent =
    coachingStatus === 'active' ? undefined : (
      <SgStageAction
        line={
          coachingStatus === 'waiting'
            ? home.coachName
              ? fill(copy.selfGuided.waitingLine, { coach: home.coachName })
              : copy.selfGuided.waitingNoName
            : copy.selfGuided.line
        }
        actionLabel={copy.selfGuided.action}
        onAction={openFree}
      />
    );

  // One slide (owner decision): resume the open workout, else start today's.
  function handleStart() {
    if (activeLog) navigate(workoutSessionPath(activeLog.logId));
    else if (stage?.kind === 'workout') void starter.start(stage.plan.id, stage.next.workout.id);
  }

  const replies: QuickReply[] = [];
  const update = home.planUpdate;
  if (update) {
    replies.push({
      id: 'plan-ready',
      label: fill(copy.coach.planReady, { range: formatWeekRange(update.data.weekStartDate, language) }),
      icon: <IconCalendarEvent size={14} stroke={2} aria-hidden="true" />,
      accent: true,
      onSelect: () => {
        home.markUpdateSeen(update.id);
        navigate(ROUTES.WORKOUTS);
      },
    });
  }
  // A real message gets "👍 Thanks!" (her coach is notified). "Reply" waits for messaging (backlog).
  if (coachMessage) {
    replies.push({
      id: 'thanks',
      label: thanks.state === 'sent' ? copy.coach.thanksSent : thanks.state === 'failed' ? copy.coach.thanksFailed : copy.coach.thanks,
      disabled: thanks.state === 'sending' || thanks.state === 'sent',
      onSelect: thanks.send,
    });
  }
  const coachAt = coachMessage?.at ?? update?.createdAt ?? null;
  const nowMs = data ? Date.parse(data.serverTime) : 0;
  const weekStatus =
    week.isLoading && !data ? (
      <StateMessage>{copy.loading}</StateMessage>
    ) : week.error && !data ? (
      <StateMessage onRetry={week.reload}>{week.error}</StateMessage>
    ) : null;

  return (
    <div className="home-screen">
      <HomeStage
        name={home.user?.name ?? ''}
        today={data?.today}
        stage={stage}
        weekCount={home.weekCount}
        activeLog={activeLog}
        onStart={handleStart}
        isStarting={starter.isStarting}
        startError={starter.error}
        status={weekStatus}
        noPlanContent={noPlanContent}
      />

      {coachingStatus === null && !joinCard.isDismissed && (
        <JoinCoachCard onOpen={() => navigate(ROUTES.JOIN_COACH_CODE)} onDismiss={joinCard.dismiss} />
      )}

      {home.startingPhoto.isVisible && (
        <StartingPhotoPrompt onTake={() => navigate(ROUTES.PROFILE_PHOTOS)} onDismiss={home.startingPhoto.dismiss} />
      )}

      {data && (
        <section className="home-section" aria-labelledby="home-week-title">
          <div className="home-section-head">
            <h2 className="home-section-title" id="home-week-title">
              <Eyebrow>{eyebrow.thisWeek}</Eyebrow>
              {fill(copy.week.title, { range: formatWeekRange(data.weekStartDate, language) })}
            </h2>
            {data.plan && (
              <button type="button" className="home-section-link" onClick={() => navigate(ROUTES.WORKOUTS)}>
                {copy.week.openPlan}
              </button>
            )}
          </div>
          <WeekTrack days={track.days} selected={track.selected} onSelect={track.select} label={copy.week.days} />
          {track.selectedDay && <WeekDayDetail day={track.selectedDay} planId={data.plan?.id ?? null} />}
        </section>
      )}

      {home.achievements && (
        <section className="home-section">
          <Scoreboard week={home.weekCount} streak={home.achievements.streak.current} />
        </section>
      )}

      <IntervalTimerEntry lastWorkSec={home.lastInterval} onOpen={() => navigate(ROUTES.INTERVAL_TIMER)} />

      {coachAt && (coachMessage || update) && (
        <section className="home-section" aria-labelledby="home-coach-title">
          <div className="home-section-head">
            <h2 className="home-section-title" id="home-coach-title">
              <Eyebrow>{eyebrow.coach}</Eyebrow>
              {copy.coach.title}
            </h2>
          </div>
          <CoachNote
            coachName={home.coachName}
            message={coachMessage?.text ?? null}
            at={coachAt}
            nowMs={nowMs}
            unread={Boolean(update) || Boolean(coachMessage?.unread)}
            replies={replies}
          />
        </section>
      )}

      {home.nextAchievements?.next && (
        <section className="home-section" aria-labelledby="home-achievement-title">
          <div className="home-section-head">
            <h2 className="home-section-title" id="home-achievement-title">
              <Eyebrow>{eyebrow.nextGoal}</Eyebrow>
              {copy.achievement.title}
            </h2>
            <button type="button" className="home-section-link" onClick={() => navigate(ROUTES.PROFILE_ACHIEVEMENTS)}>
              {copy.achievement.all}
            </button>
          </div>
          <NextAchievement achievement={home.nextAchievements.next} />
          <MiniAchievements
            items={home.nextAchievements.others}
            label={copy.achievement.others}
            onOpen={() => navigate(ROUTES.PROFILE_ACHIEVEMENTS)}
          />
        </section>
      )}

      {home.fuel && (
        <section className="home-section" aria-labelledby="home-fuel-title">
          <div className="home-section-head">
            <h2 className="home-section-title" id="home-fuel-title">
              <Eyebrow>{eyebrow.fuel}</Eyebrow>
              {copy.fuel.title}
            </h2>
            <button type="button" className="home-section-link" onClick={() => navigate(ROUTES.NUTRITION)}>
              {copy.fuel.logMeal}
            </button>
          </div>
          <FuelToday day={home.fuel} />
        </section>
      )}

      <FreeWorkoutSheet isOpen={isFreeOpen} onClose={() => setIsFreeOpen(false)} free={free} />
      <Toast message={toastMessage} />

      <StartConflictModal
        active={starter.conflict}
        isBusy={starter.isStarting}
        onClose={starter.closeConflict}
        onResume={starter.resumeActive}
        onDiscardAndStart={() => void starter.discardActiveAndStart()}
      />
    </div>
  );
}
