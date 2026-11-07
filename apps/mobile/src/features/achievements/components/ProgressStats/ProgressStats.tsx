import type { AchievementOverview } from '@sistem/types';
import { IconFlame } from '@tabler/icons-react';
import { fill, formatNumber, isolateLtr, sharedCopy, streakWeekLabel, useCopy, useI18n } from '@sistem/shared';
import { achievementCopy } from '../../copy';
import '../NextUpCard/NextUpCard.css';
import './ProgressStats.css';

interface ProgressStatsProps {
  overview: AchievementOverview;
  /** Her best streak + this week under the numbers (her page); the coach overview shows the streak card instead. */
  showStreak?: boolean;
  /** "8 / 28 הישגים" as a small chip under the numbers (the coach overview). */
  showAchievementCount?: boolean;
}

/** Her lifetime numbers in one white card (her achievements page, the coach's view) — all computed by the server. */
export function ProgressStats({ overview, showStreak = true, showAchievementCount = false }: ProgressStatsProps) {
  const { language, plural } = useI18n();
  const copy = useCopy(achievementCopy);
  const kg = useCopy(sharedCopy).units.kg;
  const { stats, streak } = overview;
  const unlocked = overview.progress.filter((entry) => entry.count > 0).length;
  const achievementCount = fill(copy.achievementCount, {
    progress: isolateLtr(`${formatNumber(unlocked, language)} / ${formatNumber(overview.progress.length, language)}`),
  });

  return (
    <section className="ach-page-card" aria-label={copy.statsTitle}>
      <dl className="ach-stats">
        <div>
          <dt>{copy.statWorkouts}</dt>
          <dd>
            <bdi dir="ltr">{formatNumber(stats.completedWorkouts, language)}</bdi>
          </dd>
        </div>
        <div>
          <dt>{copy.statVolume}</dt>
          <dd>
            <bdi dir="ltr">{formatNumber(Math.round(stats.totalVolume), language)}</bdi> <small>{kg}</small>
          </dd>
        </div>
        <div>
          <dt>{copy.statPrs}</dt>
          <dd>
            <bdi dir="ltr">{formatNumber(stats.personalRecords, language)}</bdi>
          </dd>
        </div>
      </dl>
      {showAchievementCount && (
        <p className="ach-count-chip-row">
          <span className="ach-count-chip">{achievementCount}</span>
        </p>
      )}
      {showStreak && (
        <p className="ach-streak-line">
          <span className="ach-streak-icon" aria-hidden="true">
            <IconFlame size={16} />
          </span>
          <span>{fill(copy.bestStreak, { label: plural(copy.streakValue, streak.best) })}</span>
          <span className="ach-streak-sep" aria-hidden="true">
            ·
          </span>
          <span>{streakWeekLabel(streak, language) ?? copy.noPlanThisWeek}</span>
        </p>
      )}
    </section>
  );
}
