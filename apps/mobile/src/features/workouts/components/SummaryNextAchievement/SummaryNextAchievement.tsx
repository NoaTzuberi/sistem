import type { AchievementProgress } from '@sistem/types';
import { fill, useCopy, useI18n } from '@sistem/shared';
import { DisplayText } from '../../../../components/common/DisplayText/DisplayText';
import { workoutCopy } from '../../copy';
import './SummaryNextAchievement.css';

interface SummaryNextAchievementProps {
  achievement: AchievementProgress & { threshold: number };
}

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Her next "completed workouts" achievement: a ring with her count, "3 more workouts to 25". */
export function SummaryNextAchievement({ achievement }: SummaryNextAchievementProps) {
  const copy = useCopy(workoutCopy);
  const { plural } = useI18n();
  const current = Math.min(achievement.current, achievement.threshold);
  const left = achievement.threshold - current;
  const filled = (current / achievement.threshold) * RING_LENGTH;

  return (
    <div className="ws-next">
      <span className="ws-next-ring" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle className="ws-next-track" cx="24" cy="24" r={RING_RADIUS} />
          <circle className="ws-next-value" cx="24" cy="24" r={RING_RADIUS} strokeDasharray={`${filled} ${RING_LENGTH}`} />
        </svg>
        <b>{current}</b>
      </span>
      <div className="ws-next-text">
        <b className="display-title">
          <DisplayText text={fill(plural(copy.finish.nextWorkouts, left), { target: achievement.threshold })} />
        </b>
        <small>{copy.finish.nextSub}</small>
      </div>
    </div>
  );
}
