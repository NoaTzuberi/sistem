import { useCallback, useState } from 'react';
import type { AchievementOverview, AchievementType } from '@sistem/types';
import { buildAchievementBoard } from '@sistem/shared';
import type { AchievementFilter } from '@sistem/shared';
import { AchievementGroups } from '../AchievementGroups/AchievementGroups';
import { AchievementModal } from '../AchievementModal/AchievementModal';
import { AchievementsHero } from '../AchievementsHero/AchievementsHero';
import './AchievementsTab.css';

/**
 * Profile → Achievements (docs/design/trainee-profile.html, in the coach dashboard's achievements look):
 * the pink hero, the filter, every badge by category, and the badge modal. Everything is the server's —
 * the board only arranges it (@sistem/shared buildAchievementBoard, also used by the dashboard).
 */
export function AchievementsTab({ overview }: { overview: AchievementOverview }) {
  const board = buildAchievementBoard(overview);
  const [filter, setFilter] = useState<AchievementFilter>('all');
  // The open badge stays set while the modal plays its exit; isOpen says whether it is open.
  const [openType, setOpenType] = useState<AchievementType | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback((type: AchievementType) => {
    setOpenType(type);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <div className="ach-tab">
      <AchievementsHero
        board={board}
        streak={overview.streak}
        noWorkoutsYet={overview.stats.completedWorkouts === 0}
        onOpen={(badge) => open(badge.type)}
      />
      <AchievementGroups board={board} filter={filter} onFilter={setFilter} onOpen={open} />
      <AchievementModal badge={board.badges.find((badge) => badge.type === openType) ?? null} isOpen={isOpen} onClose={close} />
    </div>
  );
}
