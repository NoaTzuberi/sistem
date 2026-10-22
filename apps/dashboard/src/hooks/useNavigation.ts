import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { ROUTES, TRAINEE_FILTER_PARAM, traineesPath } from '../app/config/routes';
import type { IconName } from '../components/common/Icon/iconPaths';
import { appCopy } from '../copy';
import { exerciseLibraryCopy } from '../features/exerciseLibrary/copy';
import { nutritionCopy } from '../features/nutrition/copy';
import { useCoachData } from '../services/coach/CoachDataContext';
import { useAuth } from '../services/auth/AuthContext';
import { hasRole } from '../features/auth/data/roles';
import { adminCopy } from '../features/admin/copy';

export interface NavItem {
  id: string;
  to: string;
  label: string;
  icon: IconName;
  /** hot = it needs her action (pink); otherwise a plain grey count. */
  badge?: { count: number; isHot: boolean };
  isCurrent: boolean;
}

export interface NavGroup {
  id: string;
  /** The first group has no label. */
  label?: string;
  items: NavItem[];
}

const WAITING_FILTER = 'waiting';

/**
 * The sidebar: every entry is an existing route (plus the two new pages, Overview and
 * Statistics), named as its page is. The palette's "screens" and the breadcrumb read it too.
 */
export function useNavigation(): { groups: NavGroup[]; current: NavItem | undefined } {
  const copy = useCopy(appCopy);
  const nutrition = useCopy(nutritionCopy);
  const exercises = useCopy(exerciseLibraryCopy);
  const { pathname, search } = useLocation();
  const { trainees } = useCoachData();
  const admin = useCopy(adminCopy);
  const { user } = useAuth();
  const isAdmin = hasRole(user, 'admin');

  return useMemo(() => {
    const isWaitingList = pathname === ROUTES.TRAINEES && new URLSearchParams(search).get(TRAINEE_FILTER_PARAM) === WAITING_FILTER;
    const waitingCount = trainees.filter((trainee) => trainee.status === 'waiting').length;
    const under = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    const groups: NavGroup[] = [
      {
        id: 'main',
        items: [
          { id: 'overview', to: ROUTES.HOME, label: copy.nav.overview, icon: 'overview', isCurrent: pathname === ROUTES.HOME },
          { id: 'stats', to: ROUTES.STATS, label: copy.nav.stats, icon: 'stats', isCurrent: under(ROUTES.STATS) },
        ],
      },
      {
        id: 'trainees',
        label: copy.nav.trainees,
        items: [
          {
            id: 'all-trainees',
            to: ROUTES.TRAINEES,
            label: copy.nav.allTrainees,
            icon: 'trainees',
            badge: trainees.length > 0 ? { count: trainees.length, isHot: false } : undefined,
            isCurrent: under(ROUTES.TRAINEES) && !isWaitingList,
          },
          {
            id: 'waiting',
            to: traineesPath(WAITING_FILTER),
            label: copy.nav.waiting,
            icon: 'waiting',
            badge: waitingCount > 0 ? { count: waitingCount, isHot: true } : undefined,
            isCurrent: isWaitingList,
          },
        ],
      },
      {
        id: 'training',
        label: copy.nav.training,
        items: [{ id: 'exercises', to: ROUTES.EXERCISES, label: exercises.title, icon: 'library', isCurrent: under(ROUTES.EXERCISES) }],
      },
      {
        id: 'nutrition',
        label: copy.nav.nutrition,
        items: [
          { id: 'foods', to: ROUTES.NUTRITION_FOODS, label: nutrition.foodsTab, icon: 'foods', isCurrent: under(ROUTES.NUTRITION_FOODS) },
          {
            id: 'nutrition-templates',
            to: ROUTES.NUTRITION_TEMPLATES,
            label: nutrition.templatesTab,
            icon: 'templates',
            isCurrent: under(ROUTES.NUTRITION_TEMPLATES),
          },
          {
            id: 'nutrition-settings',
            to: ROUTES.NUTRITION_SETTINGS,
            label: nutrition.settingsTab,
            icon: 'settings',
            isCurrent: under(ROUTES.NUTRITION_SETTINGS),
          },
        ],
      },
    ];
    // The platform admin also manages coach accounts (a page of its own).
    if (isAdmin) {
      groups.push({
        id: 'admin',
        label: admin.navGroup,
        items: [{ id: 'coaches', to: ROUTES.ADMIN_COACHES, label: admin.title, icon: 'person', isCurrent: under(ROUTES.ADMIN_COACHES) }],
      });
    }

    return { groups, current: groups.flatMap((group) => group.items).find((item) => item.isCurrent) };
  }, [copy, nutrition, exercises, admin, isAdmin, pathname, search, trainees]);
}
