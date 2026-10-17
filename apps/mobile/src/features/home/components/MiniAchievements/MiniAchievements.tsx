import type { CSSProperties } from 'react';
import type { AchievementProgress } from '@sistem/types';
import { describeAchievement, describeAchievementProgress, useLanguage } from '@sistem/shared';
import { achievementPercent, workoutColorClass } from '../../data/homeDisplay';
import './MiniAchievements.css';

interface MiniAchievementsProps {
  items: (AchievementProgress & { threshold: number })[];
  label: string;
  onOpen: () => void;
}

/** 2–3 other close achievements as chips with a conic progress ring; a tap opens all achievements. */
export function MiniAchievements({ items, label, onOpen }: MiniAchievementsProps) {
  const language = useLanguage();
  if (items.length === 0) return null;
  return (
    <ul className="mini-achievements" aria-label={label}>
      {items.map((item, index) => {
        const progress = describeAchievementProgress(item, language);
        return (
          <li key={item.type}>
            <button
              type="button"
              // The ring's fill is data (0–100), passed as a custom property; its color is the chip's class.
              style={{ '--progress': achievementPercent(item) } as CSSProperties}
              className={`mini-achievement ${workoutColorClass(index + 1)}`}
              onClick={onOpen}
            >
              <span className="mini-achievement-ring" aria-hidden="true" />
              <span>
                {describeAchievement(item.type, language).name}
                {progress && <span className="mini-achievement-progress"> · {progress}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
