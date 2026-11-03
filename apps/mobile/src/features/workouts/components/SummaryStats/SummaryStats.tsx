import type { WorkoutLogStats } from '@sistem/types';
import { formatDuration, formatVolume, useCopy, useLanguage } from '@sistem/shared';
import { workoutCopy } from '../../copy';
import './SummaryStats.css';

interface SummaryStatsProps {
  stats: WorkoutLogStats;
}

/** Duration, volume and sets the server computed at finish (PRD §5.3), as 3 white tiles. PRs show on their sets. */
export function SummaryStats({ stats }: SummaryStatsProps) {
  const language = useLanguage();
  const copy = useCopy(workoutCopy);
  const tiles = [
    { label: copy.summary.statDuration, value: formatDuration(stats.durationSec, language) },
    { label: copy.summary.statVolume, value: formatVolume(stats.totalVolume, language) },
    { label: copy.summary.statSets, value: String(stats.setsCompleted) },
  ];
  return (
    <dl className="summary-stats">
      {tiles.map((tile) => (
        <div key={tile.label} className="summary-stats-tile">
          <dt className="summary-stats-label">{tile.label}</dt>
          <dd className="summary-stats-value">
            {/* Numbers big, the unit words ('דק׳', 'ק״ג') small: '3 דק׳ 12 שנ׳' fits one tile. */}
            {tile.value.split(/(\d[\d.,]*)/).map((part, partIndex) =>
              /\d/.test(part) ? (
                <span key={partIndex}>{part}</span>
              ) : (
                part.trim() && (
                  <small key={partIndex} className="summary-stats-unit">
                    {part}
                  </small>
                )
              ),
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
