import { Link } from 'react-router-dom';
import { fill, sharedCopy, useCopy } from '@sistem/shared';
import { ROUTES } from '../../../app/config/routes';
import { appCopy } from '../../../copy';
import type { NavGroup } from '../../../hooks/useNavigation';
import { useSaveLanguage } from '../../../hooks/useSaveLanguage';
import { useAuth } from '../../../services/auth/AuthContext';
import { Avatar } from '../../common/Avatar/Avatar';
import { Icon } from '../../common/Icon/Icon';
import { LanguageToggle } from '../../common/LanguageToggle/LanguageToggle';
import { Logo } from '../../common/Logo/Logo';
import { RoundButton } from '../../common/RoundButton/RoundButton';
import './Sidebar.css';

interface SidebarProps {
  groups: NavGroup[];
  /** The icon rail: icons only, badges as small counters on them. */
  isRail: boolean;
  onToggleRail: () => void;
  /** Under 860px the sidebar is an off-canvas sheet. */
  isSheet: boolean;
  isSheetOpen: boolean;
}

const MAX_BADGE = 99;

/** The dashboard's navigation: sits on the canvas, no border; the current page is a white floating pill. */
export function Sidebar({ groups, isRail, onToggleRail, isSheet, isSheetOpen }: SidebarProps) {
  const copy = useCopy(appCopy);
  const shared = useCopy(sharedCopy);
  const { user, logout } = useAuth();
  const { saveLanguage, hasError } = useSaveLanguage();
  const classNames = ['sidebar', isRail && 'sidebar-rail', isSheet && 'sidebar-sheet', isSheetOpen && 'sidebar-sheet-open']
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classNames} id="app-sidebar" aria-label={copy.nav.main} inert={isSheet && !isSheetOpen}>
      <div className="sidebar-brand">
        <Link className="sidebar-logo-tile" to={ROUTES.HOME}>
          {/* The original files, untouched: the full logo, or its icon alone on the rail. */}
          <Logo className="sidebar-logo" variant={isRail ? 'mark' : 'onBrand'} />
        </Link>
        {!isSheet && (
          <RoundButton
            className="sidebar-collapse"
            label={isRail ? copy.shell.expand : copy.shell.collapse}
            aria-expanded={!isRail}
            aria-controls="app-sidebar"
            onClick={onToggleRail}
          >
            <Icon name="chevron" size="sm" />
          </RoundButton>
        )}
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div key={group.id} className="sidebar-group" role="group" aria-label={group.label}>
            {group.label && !isRail && <p className="sidebar-group-label">{group.label}</p>}
            {group.items.map((item) => (
              <Link
                key={item.id}
                className="sidebar-item"
                to={item.to}
                data-tour={item.tourId}
                aria-current={item.isCurrent ? 'page' : undefined}
                aria-label={item.badge ? fill(copy.shell.badge, { label: item.label, count: item.badge.count }) : item.label}
                title={isRail ? item.label : undefined}
              >
                <Icon name={item.icon} />
                {!isRail && <span className="sidebar-item-label">{item.label}</span>}
                {item.badge && (
                  <span className={item.badge.isHot ? 'sidebar-badge sidebar-badge-hot' : 'sidebar-badge'} aria-hidden="true">
                    {item.badge.count > MAX_BADGE ? `${MAX_BADGE}+` : item.badge.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <LanguageToggle className="sidebar-language" orientation={isRail ? 'vertical' : 'horizontal'} onChange={saveLanguage} />
        {hasError && (
          <p className="sidebar-error" role="alert">
            {copy.languageSaveError}
          </p>
        )}
        <div className="sidebar-user">
          <Avatar name={user?.name ?? ''} seed={user?.id} />
          {!isRail && (
            <span className="sidebar-user-text">
              <b className="sidebar-user-name">
                <bdi>{user?.name}</bdi>
              </b>
              <span className="sidebar-user-role">{copy.shell.coach}</span>
            </span>
          )}
          <button className="sidebar-logout" type="button" aria-label={shared.common.logout} title={shared.common.logout} onClick={logout}>
            <Icon name="logout" size="sm" flip />
          </button>
        </div>
      </div>
    </aside>
  );
}
