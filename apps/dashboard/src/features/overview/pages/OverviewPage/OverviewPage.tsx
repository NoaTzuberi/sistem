import { fill, formatNumber, useCopy, useLanguage } from '@sistem/shared';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { useCoachData } from '../../../../services/coach/CoachDataContext';
import { useTraineeDrawer } from '../../../trainees/hooks/useTraineeDrawer';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed';
import { EndingPlans } from '../../components/EndingPlans/EndingPlans';
import { Greeting } from '../../components/Greeting/Greeting';
import { HeroStatCard } from '../../components/HeroStatCard/HeroStatCard';
import { PumpCard } from '../../components/PumpCard/PumpCard';
import { WaitingList } from '../../components/WaitingList/WaitingList';
import { WeekBoard } from '../../components/WeekBoard/WeekBoard';
import { WeekTicks } from '../../components/WeekTicks/WeekTicks';
import { overviewCopy } from '../../copy';
import { formatShare } from '../../data/overviewFormat';
import './OverviewPage.css';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';

/** Where the coach lands: this week at a glance — every number comes from /coach/stats and her trainees list. */
export function OverviewPage() {
  const language = useLanguage();
  const copy = useCopy(overviewCopy);
  const { trainees, hasTrainees, nowMs, stats, hasStatsError, reload } = useCoachData();
  const { openDrawer } = useTraineeDrawer();
  const waiting = trainees.filter((trainee) => trainee.status === 'waiting');
  // No Daily Pump photo was ever sent: there is nothing to show, so the card is not there.
  const showPump = stats !== undefined && stats.pump.total > 0;
  const heroSpan = showPump ? 'overview-span-4' : 'overview-span-6';

  return (
    <div className="overview-page">
      <Greeting stats={stats} nowMs={nowMs} />

      {!stats && !hasStatsError && <Skeleton layout="overview" />}
      {hasStatsError && !stats && <StateLine error={copy.loadError} onRetry={reload} />}

      {stats && (
        <div className="overview-grid">
          <HeroStatCard
            className={heroSpan}
            tone="pink"
            label={copy.completion.title}
            value={formatShare(stats.thisWeek.completed, stats.thisWeek.planned, language) ?? '—'}
            caption={
              stats.thisWeek.planned > 0
                ? fill(copy.completion.caption, { done: stats.thisWeek.completed, planned: stats.thisWeek.planned })
                : copy.completion.empty
            }
          >
            <WeekTicks weeks={stats.weeklyWorkouts} label={copy.completion.weeks} />
          </HeroStatCard>

          <HeroStatCard
            className={heroSpan}
            tone="lilac"
            label={copy.waiting.title}
            value={hasTrainees ? formatNumber(waiting.length, language) : '—'}
            caption={copy.waiting.window}
          >
            <WaitingList trainees={waiting} nowMs={nowMs} onOpen={openDrawer} />
          </HeroStatCard>

          {showPump && <PumpCard className="overview-span-4 overview-pump" pump={stats.pump} />}

          <WeekBoard className="overview-span-7" stats={stats} trainees={trainees} onOpen={openDrawer} />
          <ActivityFeed className="overview-span-5" recentPrs={stats.recentPrs} nowMs={nowMs} onOpen={openDrawer} />
          <EndingPlans className="overview-span-12" stats={stats} trainees={trainees} />
        </div>
      )}
    </div>
  );
}
