import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconPlus } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { workoutLogPath, workoutSessionPath } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useStartWorkout } from '../../hooks/useStartWorkout';
import { useWeekPlan } from '../../hooks/useWeekPlan';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useFreeWorkout } from '../../hooks/useFreeWorkout';
import { FREE_WORKOUT_ENABLED } from '../../data/freeWorkout';
import { toPlannedWorkouts, type PlannedWorkout } from '../../data/weekPlanDisplay';
import { addMonths, HISTORY_FILTERS, weekStartOf, type HistoryFilter, type MonthKey } from '../../data/historyDisplay';
import { StartConflictModal } from '../StartConflictModal/StartConflictModal';
import { LargeTitleHeader } from '../LargeTitleHeader/LargeTitleHeader';
import { SegmentedTabs } from '../SegmentedTabs/SegmentedTabs';
import { WeekHeader } from '../WeekHeader/WeekHeader';
import { UpNextCard } from '../UpNextCard/UpNextCard';
import { WorkoutTicketCarousel } from '../WorkoutTicketCarousel/WorkoutTicketCarousel';
import { NextWeekLock } from '../NextWeekLock/NextWeekLock';
import { FreeWorkoutEntry } from '../FreeWorkoutEntry/FreeWorkoutEntry';
import { WorkoutPreviewSheet } from '../WorkoutPreviewSheet/WorkoutPreviewSheet';
import { FreeWorkoutSheet } from '../FreeWorkoutSheet/FreeWorkoutSheet';
import { HistorySummary } from '../HistorySummary/HistorySummary';
import { MonthCalendar } from '../MonthCalendar/MonthCalendar';
import { HistoryFilters } from '../HistoryFilters/HistoryFilters';
import { WorkoutLogGroup } from '../WorkoutLogGroup/WorkoutLogGroup';
import { workoutCopy } from '../../copy';
import './WorkoutsScreen.css';

type WorkoutsTab = 'plan' | 'history';

const TAB_PARAM = 'tab';
const panelId = (tab: WorkoutsTab) => `workouts-panel-${tab}`;

/** The free filter only exists once free workouts do. */
const FILTERS: HistoryFilter[] = FREE_WORKOUT_ENABLED ? HISTORY_FILTERS : HISTORY_FILTERS.filter((filter) => filter !== 'free');

/**
 * Trainee Workouts (PRD §5.4; docs/design/trainee-workouts.html): a sticky large title, the "Plan" tab
 * (this week from the server, next week, free workout) and the "History" tab (her completed logs on a
 * month calendar and by week). The tab lives in the URL (?tab=history). Nothing is made up: a part
 * without data is not drawn.
 */
export function WorkoutsScreen() {
  const copy = useCopy(workoutCopy);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: WorkoutsTab = params.get(TAB_PARAM) === 'history' ? 'history' : 'plan';

  const { weekPlan, activeLog, error, isLoading, reload } = useWeekPlan();
  const starter = useStartWorkout();
  const [preview, setPreview] = useState<{ planned: PlannedWorkout; isNextWeek: boolean } | null>(null);
  const [isFreeOpen, setIsFreeOpen] = useState(false);
  const free = useFreeWorkout(isFreeOpen);

  // History: loaded the first time the tab opens, then kept.
  const [historySeen, setHistorySeen] = useState(tab === 'history');
  const [month, setMonth] = useState<MonthKey | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [day, setDay] = useState<string | null>(null);
  const history = useWorkoutHistory(month, filter, day, historySeen);

  useEffect(() => {
    if (tab === 'history') setHistorySeen(true);
  }, [tab]);

  // The conflict modal replaces the sheet it came from.
  useEffect(() => {
    if (starter.conflict) setPreview(null);
  }, [starter.conflict]);

  function selectTab(next: WorkoutsTab) {
    if (next === tab) return;
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next === 'history') updated.set(TAB_PARAM, next);
        else updated.delete(TAB_PARAM);
        return updated;
      },
      { replace: true },
    );
    window.scrollTo({ top: 0 });
  }

  function start(planned: PlannedWorkout) {
    const plan = weekPlan?.plan;
    if (!plan) return;
    // Her open session (maybe of another week) is resumed in one tap, as on Home.
    if (activeLog && activeLog.workoutId === planned.workout.id) navigate(workoutSessionPath(activeLog.logId));
    else void starter.start(plan.id, planned.workout.id);
  }

  function openFree() {
    free.reset();
    setIsFreeOpen(true);
  }

  // History paging: the sentinel under the list loads the month before.
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasMore, loadMore } = history;
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loadMore, tab]);

  const changeMonth = useCallback((next: MonthKey) => {
    setMonth(next);
    setDay(null);
  }, []);

  const nextWeekFirst = weekPlan ? (toPlannedWorkouts(weekPlan.nextWeek.plan)[0] ?? null) : null;

  const planPanel = (
    <>
      {isLoading && !weekPlan && <StateMessage>{copy.list.loading}</StateMessage>}
      {error && !weekPlan && <StateMessage onRetry={reload}>{error}</StateMessage>}
      {weekPlan && (
        <>
          <WeekHeader weekStartDate={weekPlan.weekStartDate} workouts={weekPlan.workouts} doneCount={weekPlan.doneCount} />

          {!weekPlan.plan ? (
            <div className="workouts-empty">
              <StateMessage>{copy.list.noPlanThisWeek}</StateMessage>
            </div>
          ) : weekPlan.workouts.length === 0 ? (
            <div className="workouts-empty">
              <StateMessage>{copy.list.noWorkoutsInPlan}</StateMessage>
            </div>
          ) : (
            <>
              <UpNextCard
                next={weekPlan.next}
                onStart={() => weekPlan.next && start(weekPlan.next)}
                onPreview={() => weekPlan.next && setPreview({ planned: weekPlan.next, isNextWeek: false })}
                isStarting={starter.isStarting}
                error={preview ? null : starter.error}
                onFreeWorkout={FREE_WORKOUT_ENABLED ? openFree : undefined}
              />

              <div className="workouts-section-head">
                <h2 className="workouts-section-title" id="workouts-week-title">
                  {copy.plan.allWorkouts}
                </h2>
              </div>
              <WorkoutTicketCarousel
                workouts={weekPlan.workouts}
                label={copy.plan.allWorkouts}
                onOpen={(planned) => setPreview({ planned, isNextWeek: false })}
              />
            </>
          )}

          <div className="workouts-section-head">
            <h2 className="workouts-section-title">{copy.list.nextWeek}</h2>
          </div>
          <NextWeekLock
            weekStartDate={weekPlan.nextWeek.weekStartDate}
            firstWorkout={nextWeekFirst}
            onOpen={(planned) => setPreview({ planned, isNextWeek: true })}
          />

          {FREE_WORKOUT_ENABLED && (
            <>
              <div className="workouts-section-head">
                <h2 className="workouts-section-title">{copy.plan.moreToMove}</h2>
              </div>
              <FreeWorkoutEntry onOpen={openFree} />
            </>
          )}
        </>
      )}
    </>
  );

  const shownMonth = history.shownMonth;
  const historyPanel = (
    <>
      {history.isLoading && !history.today && <StateMessage>{copy.list.loading}</StateMessage>}
      {history.error && !history.today && <StateMessage onRetry={history.reload}>{history.error}</StateMessage>}
      {history.today && history.currentMonth && shownMonth && (
        <>
          <HistorySummary
            total={history.summary.total}
            inMonth={history.summary.inMonth}
            prs={history.summary.prs}
            month={history.currentMonth}
          />

          {!history.hasLogs ? (
            <div className="workouts-empty">
              <StateMessage>{copy.list.noCompletedLogs}</StateMessage>
            </div>
          ) : (
            <>
              <div className="workouts-section-head">
                <h2 className="workouts-section-title">{copy.history.monthTitle}</h2>
              </div>
              <MonthCalendar
                month={shownMonth}
                days={history.calendar}
                canGoNext={shownMonth < history.currentMonth}
                canGoPrevious={history.items.some((item) => item.date < `${shownMonth}-01`)}
                onPrevious={() => changeMonth(addMonths(shownMonth, -1))}
                onNext={() => changeMonth(addMonths(shownMonth, 1))}
                selectedDay={day}
                onSelectDay={(date) => setDay((current) => (current === date ? null : date))}
              />

              <div className="workouts-section-head">
                <h2 className="workouts-section-title">{copy.history.logTitle}</h2>
                {day && (
                  <button type="button" className="workouts-section-link" onClick={() => setDay(null)}>
                    {copy.history.clearDay}
                  </button>
                )}
              </div>
              <HistoryFilters filters={FILTERS} selected={filter} onSelect={setFilter} />

              {!history.monthHasLogs && !day && <p className="workouts-note">{copy.history.emptyMonth}</p>}
              {day && history.groups.length === 0 && <p className="workouts-note">{copy.history.emptyDay}</p>}
              {history.groups.map((group) => (
                <WorkoutLogGroup
                  key={group.weekStartDate}
                  group={group}
                  currentWeekStart={weekStartOf(history.today!)}
                  timeZone={history.timeZone}
                />
              ))}
              {history.hasMore && <div ref={sentinel} className="workouts-sentinel" aria-hidden="true" />}
            </>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="workouts-screen">
      <LargeTitleHeader
        title={copy.list.title}
        action={
          FREE_WORKOUT_ENABLED ? (
            <button type="button" className="workouts-free-pill" onClick={openFree}>
              <span className="workouts-free-pill-icon" aria-hidden="true">
                <IconPlus size={13} stroke={3} />
              </span>
              {copy.screen.freeWorkout}
            </button>
          ) : undefined
        }
      >
        <SegmentedTabs
          tabs={[
            { id: 'plan', label: copy.screen.tabPlan },
            { id: 'history', label: copy.screen.tabHistory },
          ]}
          selected={tab}
          onSelect={selectTab}
          label={copy.screen.tabsLabel}
          panelId={panelId}
        />
      </LargeTitleHeader>

      <div key={tab} className="workouts-panel" role="tabpanel" id={panelId(tab)} aria-labelledby={`tab-${tab}`}>
        {tab === 'plan' ? planPanel : historyPanel}
      </div>

      <WorkoutPreviewSheet
        planned={preview?.planned ?? null}
        isNextWeek={preview?.isNextWeek ?? false}
        onClose={() => setPreview(null)}
        onStart={start}
        onViewLog={(logId) => navigate(workoutLogPath(logId))}
        isStarting={starter.isStarting}
        error={starter.error}
      />

      {FREE_WORKOUT_ENABLED && <FreeWorkoutSheet isOpen={isFreeOpen} onClose={() => setIsFreeOpen(false)} free={free} />}

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
