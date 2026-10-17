import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCalendarEvent } from '@tabler/icons-react';
import { fill, formatWeekRange, useCopy, useLanguage } from '@sistem/shared';
import { ROUTES, workoutSessionPath } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useStartWorkout } from '../../../workouts/hooks/useStartWorkout';
import { StartConflictModal } from '../../../workouts/components/StartConflictModal/StartConflictModal';
import { KETTLEBELL_BRAND_WEIGHT } from '../../data/homeDisplay';
import { useHomeData } from '../../hooks/useHomeData';
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
  const language = useLanguage();
  const navigate = useNavigate();
  const home = useHomeData();
  const starter = useStartWorkout();
  const { week, stage, days, activeLog } = home;
  const data = week.data;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Today is selected until she taps another day.
  const todayIndex = days.findIndex((day) => day.isToday);
  const selected = selectedDay ?? (todayIndex === -1 ? 0 : todayIndex);

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
  const coachAt = home.coachMessage?.at ?? update?.createdAt ?? null;
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
        kettlebellWeight={home.kettlebellWeight ?? KETTLEBELL_BRAND_WEIGHT}
        activeLog={activeLog}
        onStart={handleStart}
        isStarting={starter.isStarting}
        startError={starter.error}
        status={weekStatus}
      />

      {home.startingPhoto.isVisible && (
        <StartingPhotoPrompt onTake={() => navigate(ROUTES.PROFILE_PHOTOS)} onDismiss={home.startingPhoto.dismiss} />
      )}

      {data && (
        <section className="home-section" aria-labelledby="home-week-title">
          <div className="home-section-head">
            <h2 className="home-section-title" id="home-week-title">
              {fill(copy.week.title, { range: formatWeekRange(data.weekStartDate, language) })}
            </h2>
            {data.plan && (
              <button type="button" className="home-section-link" onClick={() => navigate(ROUTES.WORKOUTS)}>
                {copy.week.openPlan}
              </button>
            )}
          </div>
          <WeekTrack days={days} selected={selected} onSelect={setSelectedDay} label={copy.week.days} />
          {days[selected] && <WeekDayDetail day={days[selected]} planId={data.plan?.id ?? null} />}
        </section>
      )}

      {home.achievements && (
        <section className="home-section">
          <Scoreboard
            week={home.weekCount}
            streak={home.achievements.streak.current}
            totalVolume={home.achievements.stats.totalVolume}
          />
        </section>
      )}

      <IntervalTimerEntry lastWorkSec={home.lastInterval} onOpen={() => navigate(ROUTES.INTERVAL_TIMER)} />

      {coachAt && (home.coachMessage || replies.length > 0) && (
        <section className="home-section" aria-label={copy.coach.title}>
          <CoachNote message={home.coachMessage?.text ?? null} at={coachAt} nowMs={nowMs} replies={replies} />
        </section>
      )}

      {home.nextAchievements?.next && (
        <section className="home-section" aria-labelledby="home-achievement-title">
          <div className="home-section-head">
            <h2 className="home-section-title" id="home-achievement-title">
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
              {copy.fuel.title}
            </h2>
            <button type="button" className="home-section-link" onClick={() => navigate(ROUTES.NUTRITION)}>
              {copy.fuel.logMeal}
            </button>
          </div>
          <FuelToday day={home.fuel} />
        </section>
      )}

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
