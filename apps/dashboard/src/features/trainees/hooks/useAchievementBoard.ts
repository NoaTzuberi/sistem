import { useCallback, useState } from 'react';
import type { AchievementType } from '@sistem/types';
import { getActiveLanguage, useLoad } from '@sistem/shared';
import { getTraineeAchievements } from '../../../services/coach/coachService';
import { buildAchievementBoard } from '@sistem/shared';
import type { AchievementFilter } from '@sistem/shared';
import { traineesCopy } from '../copy';

/** The Achievements tab: her overview from the server, the board built from it, the filter and the open badge. */
export function useAchievementBoard(traineeId: string) {
  const load = useCallback(() => getTraineeAchievements(traineeId), [traineeId]);
  const { data, error, isLoading, reload } = useLoad(load, traineesCopy[getActiveLanguage()].achievementsLoadError);
  const [filter, setFilter] = useState<AchievementFilter>('all');
  // The open badge stays set while the modal plays its exit; isOpen says whether it is open.
  const [openType, setOpenType] = useState<AchievementType | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((type: AchievementType) => {
    setOpenType(type);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    overview: data,
    board: data ? buildAchievementBoard(data) : null,
    error,
    isLoading,
    reload,
    filter,
    setFilter,
    openType,
    isOpen,
    open,
    close,
  };
}
