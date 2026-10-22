import type { AchievementCategory } from '@sistem/shared';
import type { IconName } from '../../../components/common/Icon/iconPaths';

// The Achievements tab's category icons and classes. The categories themselves (and which achievement
// belongs where) live in @sistem/shared achievementDisplay.ts — the trainee's Profile uses them too.
export { ACHIEVEMENT_CATEGORIES, achievementCategory } from '@sistem/shared';
export type { AchievementCategory } from '@sistem/shared';

export const CATEGORY_ICON: Record<AchievementCategory, IconName> = {
  workouts: 'dumbbell',
  streaks: 'flame',
  perfect: 'star',
  records: 'trophy',
  volume: 'volume',
  tracking: 'body',
};

/** The global class that sets --ach-color / --ach-light for a category (styles/globals.css). */
export function achievementCategoryClass(category: AchievementCategory): string {
  return `ach-category-${category}`;
}
