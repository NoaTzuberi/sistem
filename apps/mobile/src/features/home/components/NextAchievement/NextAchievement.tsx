import type { AchievementProgress } from '@sistem/types';
import { describeAchievement, describeAchievementProgress, useLanguage } from '@sistem/shared';
import { achievementTicks, isHebrewText } from '../../data/homeDisplay';
import { AchievementTicks } from '../AchievementTicks/AchievementTicks';
import './NextAchievement.css';

interface NextAchievementProps {
  achievement: AchievementProgress & { threshold: number };
}

/** The locked achievement she is closest to: its target, "21 / 25", the ticks and its one-line rule. */
export function NextAchievement({ achievement }: NextAchievementProps) {
  const language = useLanguage();
  const { name, description } = describeAchievement(achievement.type, language);
  const progress = describeAchievementProgress(achievement, language);

  return (
    <div className="next-achievement">
      <p className="next-achievement-head">
        <bdi className={'next-achievement-target' + (isHebrewText(name) ? ' next-achievement-target-he' : '')} dir="auto">
          {name}
        </bdi>
        {progress && <span className="next-achievement-progress">{progress}</span>}
      </p>
      <AchievementTicks ticks={achievementTicks(achievement.current, achievement.threshold)} />
      {description && <p className="next-achievement-hint">{description}</p>}
    </div>
  );
}
