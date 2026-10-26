import { useCallback } from 'react';
import { useCopy, useLoad } from '@sistem/shared';
import { getTraineeAchievements } from '../../../../services/coach/coachService';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { StreakSummary } from '../../../achievements/components/StreakSummary/StreakSummary';
import { ProgressStats } from '../../../achievements/components/ProgressStats/ProgressStats';
import { AchievementList } from '../../../achievements/components/AchievementList/AchievementList';
import { achievementCopy } from '../../../achievements/copy';
import './TraineeAchievements.css';

interface TraineeAchievementsProps {
  traineeId: string;
  /** The streak and the numbers only (the trainee overview) — no full achievement list. */
  compact?: boolean;
}

/** The Achievements tab (coach mode): her streak, numbers and achievements — her own views, read-only. */
export function TraineeAchievements({ traineeId, compact = false }: TraineeAchievementsProps) {
  const copy = useCopy(achievementCopy);
  const load = useCallback(() => getTraineeAchievements(traineeId), [traineeId]);
  const { data, error, reload } = useLoad(load, copy.loadError);

  if (!data && error) return <StateMessage onRetry={reload}>{error}</StateMessage>;
  if (!data) return <StateMessage>{copy.loading}</StateMessage>;
  return (
    <div className="trainee-achievements">
      <StreakSummary streak={data.streak} />
      <ProgressStats overview={data} />
      {!compact && <AchievementList progress={data.progress} />}
    </div>
  );
}
