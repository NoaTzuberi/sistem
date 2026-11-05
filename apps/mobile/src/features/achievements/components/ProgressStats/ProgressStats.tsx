import type { AchievementOverview } from '@sistem/types';
import { formatVolume, useCopy, useLanguage } from '@sistem/shared';
import { achievementCopy } from '../../copy';
import './ProgressStats.css';

interface ProgressStatsProps {
  overview: AchievementOverview;
}

/** Her lifetime numbers (Profile, coach view) — all computed by the server. */
export function ProgressStats({ overview }: ProgressStatsProps) {
  const language = useLanguage();
  const copy = useCopy(achievementCopy);
  const unlocked = overview.progress.filter((entry) => entry.count > 0).length;
  const stats = [
    { label: copy.statWorkouts, value: String(overview.stats.completedWorkouts) },
    { label: copy.statVolume, value: formatVolume(overview.stats.totalVolume, language) },
    { label: copy.statPrs, value: String(overview.stats.personalRecords) },
    { label: copy.statAchievements, value: `${unlocked} / ${overview.progress.length}` },
  ];
  return (
    <dl className="progress-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="progress-stats-item">
          <dt className="progress-stats-label">{stat.label}</dt>
          <dd className="progress-stats-value">
            <bdi dir="ltr">{stat.value}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  );
}
