import { type MouseEvent, type ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconActivityHeartbeat, IconBarbell, IconHome, IconSalad, IconUser, IconUsers } from '@tabler/icons-react';
import type { TabUpdates } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { useAuth } from '../../../services/auth/AuthContext';
import { hapticSelection } from '../../../services/haptics/haptics';
import { TABS, type TabId, tabIndexOf } from '../../../app/config/tabs';
import { TabUpdateDot } from '../../../features/nutrition/components/TabUpdateDot/TabUpdateDot';
import { clearTabUpdate, useTabUpdates } from '../../../features/nutrition/tabUpdates';
import { appCopy } from '../../../copy';
import { useDockVisible } from './dockStore';
import './AppDock.css';
import { appRole } from '../../../services/auth/appRole';

const ICON_SIZE = 21;
const ICON_STROKE = 2.2;

const ICONS: Record<TabId, ReactNode> = {
  home: <IconHome size={ICON_SIZE} stroke={ICON_STROKE} />,
  workouts: <IconBarbell size={ICON_SIZE} stroke={ICON_STROKE} />,
  nutrition: <IconSalad size={ICON_SIZE} stroke={ICON_STROKE} />,
  profile: <IconUser size={ICON_SIZE} stroke={ICON_STROKE} />,
  today: <IconActivityHeartbeat size={ICON_SIZE} stroke={ICON_STROKE} />,
  trainees: <IconUsers size={ICON_SIZE} stroke={ICON_STROKE} />,
};

function badgeOf(id: TabId, updates: TabUpdates): ReactNode {
  if (id === 'workouts') return <TabUpdateDot visible={updates.workouts} />;
  if (id === 'nutrition') return <TabUpdateDot visible={updates.nutrition} />;
  return null;
}

interface AppDockProps {
  /** A screen transition is running: taps wait for it (nothing else is blocked). */
  busy: boolean;
}

/**
 * The floating ink dock (replaces the tab bar). Inactive tabs are icons; the current one opens into a
 * pink pill with its label. Labels stay in the accessibility tree when collapsed (opacity, not display).
 */
export function AppDock({ busy }: AppDockProps) {
  const { user } = useAuth();
  const copy = useCopy(appCopy);
  const { pathname } = useLocation();
  const visible = useDockVisible();
  const role = appRole(user);
  const isTrainee = role === 'trainee';
  const updates = useTabUpdates(isTrainee);
  const tabs = role ? TABS[role] : [];
  const currentIndex = tabIndexOf(pathname);
  const current = currentIndex === null ? null : tabs[currentIndex];
  const openUpdateTab = isTrainee && (current?.id === 'workouts' || current?.id === 'nutrition') ? current.id : null;
  const hasUnseen = openUpdateTab !== null && updates[openUpdateTab];

  // Opening a tab clears its dot (stored on the server, so on every device).
  useEffect(() => {
    if (openUpdateTab && hasUnseen) void clearTabUpdate(openUpdateTab);
  }, [openUpdateTab, hasUnseen]);

  if (!user || !visible) return null;

  function handleClick(event: MouseEvent<HTMLAnchorElement>, index: number) {
    if (busy) {
      event.preventDefault();
      return;
    }
    if (index !== currentIndex) hapticSelection();
  }

  return (
    <nav className="app-dock" aria-label={copy.tabs.navigation}>
      {tabs.map((tab, index) => {
        const isCurrent = index === currentIndex;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            className="app-dock-tab"
            aria-current={isCurrent ? 'page' : undefined}
            onClick={(event) => handleClick(event, index)}
          >
            <span className="app-dock-icon" aria-hidden="true">
              {ICONS[tab.id]}
            </span>
            {badgeOf(tab.id, updates)}
            <span className="app-dock-label">{copy.tabs[tab.id]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
