import type { AchievementCategory } from '@sistem/shared';
import { IconBarbell, IconFlame, IconRuler2, IconStar, IconTrophy, IconWeight } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

// The achievement categories' icons and color classes on the phone. The categories themselves (and which
// achievement belongs where) live in @sistem/shared achievementDisplay.ts. Mirrors the dashboard's
// features/trainees/data/achievementCategories.ts (its own icon set).

export const CATEGORY_ICON: Record<AchievementCategory, Icon> = {
  workouts: IconBarbell,
  streaks: IconFlame,
  perfect: IconStar,
  records: IconTrophy,
  volume: IconWeight,
  tracking: IconRuler2,
};

/** The global class that sets --ach-color / --ach-light / --ach-text for a category (styles/achievementColors.css). */
export function achievementCategoryClass(category: AchievementCategory): string {
  return `ach-category-${category}`;
}
