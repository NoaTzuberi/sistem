import { Link } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../copy';
import { NotificationBell } from '../../../features/notifications/components/NotificationBell/NotificationBell';
import { traineesCopy } from '../../../features/trainees/copy';
import { paletteShortcutLabel } from '../../../hooks/usePaletteHotkey';
import { Icon } from '../../common/Icon/Icon';
import { RoundButton } from '../../common/RoundButton/RoundButton';
import './TopLine.css';

interface TopLineProps {
  /** The current page's name, as the sidebar calls it. */
  pageName: string | undefined;
  /** With a detail, the page name links back to its page. */
  pageTo?: string;
  /** The open item inside the page (the trainee on her profile and builders). */
  detail?: string;
  /** Under 860px: the button that opens the sidebar sheet. */
  showMenu: boolean;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  onNewPlan: () => void;
}

/** Above every page: where she is, search (⌘K), notifications and "new plan". */
export function TopLine({ pageName, pageTo, detail, showMenu, isMenuOpen, onOpenMenu, onOpenSearch, onNewPlan }: TopLineProps) {
  const copy = useCopy(appCopy);
  const trainees = useCopy(traineesCopy);

  return (
    <div className="top-line">
      {showMenu && (
        <RoundButton label={copy.shell.menu} aria-expanded={isMenuOpen} aria-controls="app-sidebar" onClick={onOpenMenu}>
          <Icon name="menu" />
        </RoundButton>
      )}
      <p className="top-line-crumb">
        {/* The brand name stays as it is in every language. i18n-ignore */}
        <span>Sistem</span>
        {pageName && (
          <>
            <span aria-hidden="true"> / </span>
            {detail && pageTo ? (
              <Link className="top-line-section" to={pageTo}>
                {pageName}
              </Link>
            ) : (
              <b className="top-line-page">{pageName}</b>
            )}
          </>
        )}
        {detail && (
          <>
            <span aria-hidden="true"> / </span>
            <b className="top-line-page">
              <bdi>{detail}</bdi>
            </b>
          </>
        )}
      </p>
      <button className="top-line-search" type="button" aria-label={copy.shell.search} onClick={onOpenSearch}>
        <Icon name="search" size="sm" />
        <span className="top-line-search-text">{copy.shell.search}</span>
        <kbd className="top-line-key">{paletteShortcutLabel()}</kbd>
      </button>
      <NotificationBell />
      <button className="top-line-cta" type="button" aria-label={trainees.newPlan} onClick={onNewPlan}>
        <Icon name="plus" size="sm" />
        <span className="top-line-cta-text">{trainees.newPlan}</span>
      </button>
    </div>
  );
}
