import type { AchievementOverview } from '@sistem/types';
import { fill, sharedCopy, useCopy } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { useStatsIntro } from '../../../stats/hooks/useStatsIntro';
import type { AchievementBoard } from '@sistem/shared';
import { useAchievementBoard } from '../../hooks/useAchievementBoard';
import { AchievementGrid } from '../AchievementGrid/AchievementGrid';
import { AchievementModal } from '../AchievementModal/AchievementModal';
import { AchievementsHero } from '../AchievementsHero/AchievementsHero';
import { AchievementStats } from '../AchievementStats/AchievementStats';
import './TraineeAchievements.css';
import { traineesCopy } from '../../copy';
import { Skeleton } from '../../../../components/common/Skeleton/Skeleton';

interface TraineeAchievementsProps {
  traineeId: string;
}

/**
 * The Achievements tab (Phase 11, PRD §6), game-like: the pink hero (unlocked count, XP bar, what
 * is next, streak, latest unlock), her numbers, and every badge by category with its modal.
 * Read-only — everything is computed by the server.
 */
export function TraineeAchievements({ traineeId }: TraineeAchievementsProps) {
  const shared = useCopy(sharedCopy);
  const state = useAchievementBoard(traineeId);

  if (state.isLoading && !state.overview) return <Skeleton layout="panel" />;
  if (!state.overview || !state.board) {
    return (
      <p className="trainee-achievements-message" role="alert">
        {state.error}{' '}
        <PillButton size="sm" onClick={state.reload}>
          {shared.common.retry}
        </PillButton>
      </p>
    );
  }
  return <AchievementsContent overview={state.overview} board={state.board} state={state} />;
}

/** Mounted with the data, so the entrance (count-up, XP bar) starts when there is something to show. */
function AchievementsContent({
  overview,
  board,
  state,
}: {
  overview: AchievementOverview;
  board: AchievementBoard;
  state: ReturnType<typeof useAchievementBoard>;
}) {
  const copy = useCopy(traineesCopy);
  const intro = useStatsIntro('sistem.trainee.achievementsIntroPlayed');
  const openBadge = board.badges.find((badge) => badge.type === state.openType) ?? null;

  return (
    <div className="trainee-achievements">
      <AchievementsHero
        board={board}
        streak={overview.streak}
        noWorkoutsYet={overview.stats.completedWorkouts === 0}
        intro={intro}
        onOpen={(badge) => state.open(badge.type)}
      />
      <AchievementStats overview={overview} />
      <AchievementGrid board={board} filter={state.filter} onFilter={state.setFilter} onOpen={state.open} />
      <p className="trainee-achievements-note">{fill(copy.streakRule, { percent: Math.round(overview.streak.weekCompletionRatio * 100) })}</p>
      <AchievementModal badge={openBadge} isOpen={state.isOpen} onClose={state.close} />
    </div>
  );
}
