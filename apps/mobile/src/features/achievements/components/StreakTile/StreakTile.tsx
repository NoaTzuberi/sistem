import type { StreakSummary } from '@sistem/types';
import { formatNumber, formatPlural, useCopy, useLanguage } from '@sistem/shared';
import { IconFlame } from '@tabler/icons-react';
import { achievementCopy } from '../../copy';
import './StreakTile.css';

/** Her weekly streak on the achievements hero: frosted glass, an orange flame (cold at 0), the run in weeks. */
export function StreakTile({ streak }: { streak: StreakSummary }) {
  const language = useLanguage();
  const copy = useCopy(achievementCopy).board;
  return (
    <div className={streak.current > 0 ? 'streak-tile' : 'streak-tile streak-tile-cold'}>
      <span className="streak-tile-flame" aria-hidden="true">
        <IconFlame size={22} stroke={2} />
      </span>
      <span className="streak-tile-text">
        <b className="streak-tile-count">{formatNumber(streak.current, language)}</b>
        <span className="streak-tile-label">{formatPlural(language, copy.weeksInRow, streak.current)}</span>
      </span>
    </div>
  );
}
