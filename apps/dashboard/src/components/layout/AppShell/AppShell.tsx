import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { ROUTES } from '../../../app/config/routes';
import { TraineeQuickView } from '../../../features/trainees/components/TraineeQuickView/TraineeQuickView';
import { TraineeDrawerProvider } from '../../../features/trainees/hooks/useTraineeDrawer';
import type { PaletteMode } from '../../../hooks/useCommandPalette';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useNavigation } from '../../../hooks/useNavigation';
import { usePaletteHotkey } from '../../../hooks/usePaletteHotkey';
import { useSlashSearch } from '../../../hooks/useSlashSearch';
import { useEnterToBlur } from '../../../hooks/useEnterToBlur';
import { useSidebarCollapse } from '../../../hooks/useSidebarCollapse';
import { CoachDataProvider, useCoachData } from '../../../services/coach/CoachDataContext';
import { CommandPalette } from '../CommandPalette/CommandPalette';
import { Sidebar } from '../Sidebar/Sidebar';
import { TopLine } from '../TopLine/TopLine';
import './AppShell.css';

// = --breakpoint-dash-nav (CSS can't read a variable inside a media query).
const SHEET_QUERY = '(max-width: 860px)';

/** The frame around every signed-in page: the canvas, the sidebar, the top line, and what floats above them. */
export function AppShell() {
  return (
    <CoachDataProvider>
      <TraineeDrawerProvider>
        <ShellFrame />
      </TraineeDrawerProvider>
    </CoachDataProvider>
  );
}

function ShellFrame() {
  const { groups, current } = useNavigation();
  const { isCollapsed, toggleCollapsed } = useSidebarCollapse();
  const isSheet = useMediaQuery(SHEET_QUERY);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [palette, setPalette] = useState<PaletteMode | null>(null);
  const { pathname, search } = useLocation();
  // A trainee's pages (profile, builders) add her name to the breadcrumb.
  const traineeMatch = useMatch(`${ROUTES.TRAINEE}/*`);
  const { trainees } = useCoachData();
  const traineeName = traineeMatch ? trainees.find((trainee) => trainee.id === traineeMatch.params.traineeId)?.name : undefined;

  // Pages change at once (no transition); the sheet has done its job.
  useEffect(() => {
    setIsSheetOpen(false);
    window.scrollTo(0, 0);
  }, [pathname, search]);

  useEffect(() => {
    if (!isSheet) setIsSheetOpen(false);
  }, [isSheet]);

  useEffect(() => {
    if (!isSheetOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsSheetOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSheetOpen]);

  const togglePalette = useCallback(() => setPalette((open) => (open ? null : 'search')), []);
  const closePalette = useCallback(() => setPalette(null), []);
  usePaletteHotkey(togglePalette);
  // "/" jumps to the open list page's search (inputs marked data-search-shortcut).
  useSlashSearch();
  useEnterToBlur();

  return (
    <div className="app-shell">
      <Sidebar
        groups={groups}
        isRail={isCollapsed && !isSheet}
        onToggleRail={toggleCollapsed}
        isSheet={isSheet}
        isSheetOpen={isSheetOpen}
      />
      {isSheet && (
        <div
          className={isSheetOpen ? 'app-shell-scrim app-shell-scrim-open' : 'app-shell-scrim'}
          onClick={() => setIsSheetOpen(false)}
        />
      )}

      <div className="app-main">
        <TopLine
          pageName={current?.label}
          pageTo={traineeName ? current?.to : undefined}
          detail={traineeName}
          showMenu={isSheet}
          isMenuOpen={isSheetOpen}
          onOpenMenu={() => setIsSheetOpen(true)}
          onOpenSearch={() => setPalette('search')}
          onNewPlan={() => setPalette('newPlan')}
        />
        <main className="app-page">
          <Outlet />
        </main>
      </div>

      <TraineeQuickView />
      {palette && <CommandPalette mode={palette} onClose={closePalette} onModeChange={setPalette} />}
    </div>
  );
}
