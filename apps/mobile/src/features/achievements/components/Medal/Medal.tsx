import { IconLock } from '@tabler/icons-react';
import { CATEGORY_ICON } from '../../data/achievementCategories';
import type { AchievementCategory } from '@sistem/shared';
import './Medal.css';

interface MedalProps {
  category: AchievementCategory;
  unlocked: boolean;
  /** 0–1: the locked medal's progress ring (no ring stroke at 0). */
  fraction: number;
  /** A count badge (5 / 10 / 25 …): the earned disc shows this number instead of the icon. */
  number?: number | null;
  /** The owner's icon file for this achievement (data/achievementIcons.ts), when there is one. */
  image?: string;
  size?: 'small' | 'regular' | 'large';
}

/**
 * An achievement's medal, in its category's color (--ach-color / --ach-light from the parent).
 * Earned: a glossy disc (highlight over light → color), a white ring, an outer ring in the color and
 * a colored glow; the icon or the count. Locked: a grey disc, the progress ring from 12 o'clock and a
 * lock. Decorative — the card around it says what it is.
 * MIRROR of apps/dashboard/src/features/trainees/components/Medal — change both. Phone only: `image`
 * (the owner's icon slots) and Tabler icons.
 */
export function Medal({ category, unlocked, fraction, number = null, image, size = 'regular' }: MedalProps) {
  const CategoryIcon = CATEGORY_ICON[category];
  return (
    <span className={`medal medal-${size} ${unlocked ? 'medal-unlocked' : 'medal-locked'}`} aria-hidden="true">
      {!unlocked && (
        <svg className="medal-ring" viewBox="0 0 100 100">
          <circle className="medal-ring-track" cx="50" cy="50" r="46" />
          {fraction > 0 && (
            <circle className="medal-ring-progress" cx="50" cy="50" r="46" pathLength={1} strokeDasharray={`${fraction} 1`} transform="rotate(-90 50 50)" />
          )}
        </svg>
      )}
      <span className="medal-disc">
        {unlocked && image ? (
          <img className="medal-image" src={image} alt="" />
        ) : unlocked && number !== null ? (
          <b className="medal-number">{number}</b>
        ) : (
          <CategoryIcon className="medal-icon" stroke={1.8} />
        )}
      </span>
      {!unlocked && (
        <span className="medal-lock">
          <IconLock className="icon" stroke={2} />
        </span>
      )}
    </span>
  );
}
