import { useState } from 'react';
import type { CoachStats, CoachStatsRange } from '@sistem/types';
import { dateFormat, fill, formatNumber, formatWeekSpan, isolateLtr, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { PageHeader } from '../../../../components/common/PageHeader/PageHeader';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { WidgetCard } from '../../../../components/common/WidgetCard/WidgetCard';
import { formatChange, weekOfYear } from '../../../overview/data/overviewFormat';
import { ActiveTraineesChart } from '../../components/ActiveTraineesChart/ActiveTraineesChart';
import { ChartHeadline } from '../../components/ChartHeadline/ChartHeadline';
import { GoalsList } from '../../components/GoalsList/GoalsList';
import { Meter } from '../../components/Meter/Meter';
import { RangeSegmented } from '../../components/RangeSegmented/RangeSegmented';
import { RetentionCard } from '../../components/RetentionCard/RetentionCard';
import { Sparkline } from '../../components/Sparkline/Sparkline';
import { StatTile } from '../../components/StatTile/StatTile';
import type { StatDelta } from '../../components/StatTile/StatTile';
import { WeeklyWorkoutsChart } from '../../components/WeeklyWorkoutsChart/WeeklyWorkoutsChart';
import { statsCopy } from '../../copy';
import { valueSince } from '../../data/statsFormat';
import { useStats } from '../../hooks/useStats';
import { useStatsIntro } from '../../hooks/useStatsIntro';
import './StatsPage.css';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';

const DEFAULT_RANGE: CoachStatsRange = 6;
/** The promise the waiting screen makes: a plan within 48 hours of the questionnaire (PRD §5). */
const PLAN_WINDOW_HOURS = 48;

/** How the business and the trainees' consistency are doing — every number from GET /coach/stats. */
export function StatsPage() {
  const copy = useCopy(statsCopy);
  const [range, setRange] = useState<CoachStatsRange>(DEFAULT_RANGE);
  const { stats, hasError, reload } = useStats(range);
  const ranges: { id: CoachStatsRange; label: string }[] = [
    { id: 3, label: copy.ranges.months3 },
    { id: 6, label: copy.ranges.months6 },
    { id: 12, label: copy.ranges.months12 },
  ];

  return (
    <div className="stats-page">
      <PageHeader title={copy.title} subtitle={copy.subtitle}>
        <RangeSegmented label={copy.rangeLabel} options={ranges} value={range} onChange={setRange} />
      </PageHeader>

      {!stats && !hasError && <Skeleton layout="cards" />}
      {hasError && !stats && <StateLine error={copy.loadError} onRetry={reload} />}
      {stats && <StatsContent stats={stats} />}
    </div>
  );
}

/** A count that moved: up in the tile's color, down in muted ink; nothing when it did not move. */
function countDelta(change: number, text: string | null): StatDelta | null {
  if (text === null) return null;
  return change > 0 ? { direction: 'up', text } : { direction: 'down', text, quiet: true };
}

// Mounted once the numbers are there and kept through range changes: the entrance belongs to it.
function StatsContent({ stats }: { stats: CoachStats }) {
  const language = useLanguage();
  const copy = useCopy(statsCopy);
  const shared = useCopy(sharedCopy);
  const intro = useStatsIntro();
  const { summary } = stats;
  const goalLabels: Readonly<Record<string, string>> = shared.onboardingOptions.goals;
  const whole = (value: number) => formatNumber(value, language);

  const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);
  const months = stats.activeByMonth.map((point) => ({
    key: point.month,
    axisLabel: dateFormat(language, { month: 'short', timeZone: 'UTC' }).format(monthDate(point.month)),
    label: dateFormat(language, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate(point.month)),
    value: valueSince(point, stats.firstTraineeMonth, point.active),
  }));
  const weeks = stats.weeklyWorkouts.map((week) => ({
    key: week.weekStartDate,
    weekNumber: weekOfYear(week.weekStartDate),
    label: formatWeekSpan(week.weekStartDate, language),
    value: week.completed,
  }));

  // The change over the months the chart shows: newest minus the oldest one that has data.
  const knownMonths = months.flatMap((month) => (month.value === null ? [] : [month.value]));
  const rangeChange = knownMonths.length > 1 ? knownMonths[knownMonths.length - 1] - knownMonths[0] : null;

  // A change from last month only means something when she already had trainees then.
  const lastMonth = stats.recentMonths[stats.recentMonths.length - 2];
  const hadLastMonth = lastMonth !== undefined && valueSince(lastMonth, stats.firstTraineeMonth, 0) !== null;
  const monthDelta = (change: number) => (hadLastMonth ? countDelta(change, formatChange(change, language)) : null);

  const completion = summary.plannedWorkouts > 0 ? summary.completedWorkouts / summary.plannedWorkouts : null;
  const hours = summary.hoursToFirstPlan;
  // The meter's whole is the 48-hour window — or the wait itself once it is longer, so the mark still shows where 48 was.
  const meterHours = hours === null ? PLAN_WINDOW_HOURS : Math.max(PLAN_WINDOW_HOURS, hours);
  const hoursSaved = hours === null || summary.hoursToFirstPlanPrevious === null ? 0 : Math.round(summary.hoursToFirstPlanPrevious - hours);
  // A shorter wait is the welcome direction here: down in the tile's color, up in muted ink.
  const hoursDelta: StatDelta | null =
    hoursSaved === 0
      ? null
      : { direction: hoursSaved > 0 ? 'down' : 'up', text: `${whole(Math.abs(hoursSaved))} ${copy.tiles.hours}`, quiet: hoursSaved < 0 };

  return (
    <>
      <div className="stats-tiles">
        <StatTile
          tone="pink"
          label={copy.tiles.active}
          value={summary.activeTrainees}
          format={whole}
          delta={monthDelta(summary.activeTraineesChange)}
          note={copy.tiles.activeChange}
          intro={intro}
        >
          <Sparkline values={stats.recentMonths.map((point) => valueSince(point, stats.firstTraineeMonth, point.active))} />
        </StatTile>
        <StatTile
          tone="purple"
          label={copy.tiles.newThisMonth}
          value={summary.newTraineesThisMonth}
          format={whole}
          delta={monthDelta(summary.newTraineesChange)}
          note={copy.tiles.newChange}
          intro={intro}
        >
          <Sparkline values={stats.recentMonths.map((point) => valueSince(point, stats.firstTraineeMonth, point.newTrainees))} />
        </StatTile>
        <StatTile
          tone="orange"
          label={copy.tiles.completion}
          value={completion === null ? null : completion * 100}
          format={(percent) => formatNumber(percent / 100, language, { style: 'percent', maximumFractionDigits: 0 })}
          note={copy.tiles.completionNote}
          intro={intro}
        >
          {completion !== null && <Meter share={completion} intro={intro} />}
        </StatTile>
        <StatTile
          tone="blue"
          label={copy.tiles.timeToPlan}
          value={hours}
          format={whole}
          unit={copy.tiles.hours}
          delta={hoursDelta}
          note={copy.tiles.timeToPlanNote}
          intro={intro}
        >
          {hours !== null && (
            <Meter share={hours / meterHours} tick={PLAN_WINDOW_HOURS / meterHours} tickLabel={copy.tiles.windowMark} intro={intro} />
          )}
        </StatTile>
      </div>

      <div className="stats-grid">
        <WidgetCard
          className="stats-span-7"
          title={copy.active.title}
          subtitle={copy.active.subtitle}
          action={
            <ChartHeadline
              value={whole(summary.activeTrainees)}
              note={
                rangeChange === null
                  ? undefined
                  : fill(copy.active.inRange, { change: isolateLtr(formatNumber(rangeChange, language, { signDisplay: 'always' })) })
              }
            />
          }
        >
          <ActiveTraineesChart points={months} intro={intro} />
        </WidgetCard>
        <WidgetCard
          className="stats-span-5"
          title={copy.weekly.title}
          subtitle={copy.weekly.subtitle}
          action={<ChartHeadline value={whole(weeks[weeks.length - 1]?.value ?? 0)} note={copy.weekly.thisWeek} />}
        >
          <WeeklyWorkoutsChart bars={weeks} intro={intro} />
        </WidgetCard>
        <WidgetCard
          className="stats-span-5"
          title={copy.goals.title}
          subtitle={fill(copy.goals.subtitle, { count: whole(summary.activeTrainees) })}
        >
          <GoalsList
            goals={stats.goals.map((goal) => ({ id: goal.goalId, label: goalLabels[goal.goalId] ?? goal.goalId, count: goal.count }))}
            intro={intro}
          />
        </WidgetCard>
        <WidgetCard className="stats-span-7" title={copy.retention.title} subtitle={copy.retention.subtitle}>
          <RetentionCard retention={stats.retention} averageRating={summary.averageRating} intro={intro} />
        </WidgetCard>
      </div>
    </>
  );
}
