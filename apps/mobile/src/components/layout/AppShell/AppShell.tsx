import type { ReactNode } from 'react';
import { usePageEnter } from '../../../hooks/usePageEnter';
import { useDocumentSurface } from '../../../hooks/useDocumentSurface';
import type { DocumentSurface } from '../../../hooks/useDocumentSurface';
import { useDockRequest } from '../AppDock/dockStore';
import { useScreenPhase } from '../ScreenTransition/screenPhase';
import './AppShell.css';

interface AppShellProps {
  children: ReactNode;
  /** Focused flows (onboarding, the workout session) render without the dock. */
  hideTabBar?: boolean;
  /** Full-bleed screen (Trainee Home): no side / top padding — the screen draws to the edges itself. */
  bleed?: boolean;
  /** The screen's page color: 'soft' = the #F6F4F7 sub-screen surface (the shell and the band behind the dock match it). */
  surface?: 'soft';
  /**
   * The colors outside the page (iOS Safari's bars, under its toolbar, the overscroll — useDocumentSurface).
   * bottom: default = the shell's own ground (soft → 'soft', bleed → 'card', else 'page');
   * top: default = bottom. A screen whose top is drawn in another color (the ink coach stage, Home's pink) names it.
   */
  bottom?: DocumentSurface;
  top?: DocumentSurface;
}

export function AppShell({ children, hideTabBar = false, bleed = false, surface, bottom, top }: AppShellProps) {
  const edge = bottom ?? (surface === 'soft' ? 'soft' : bleed ? 'card' : 'page');
  useDocumentSurface(edge, top ?? edge);
  // A tab transition already moves the whole screen: no second enter animation on top of it.
  const mainRef = usePageEnter<HTMLElement>(useScreenPhase() !== 'enter');
  // The dock is one element outside the screens (ScreenTransition); this screen asks for it.
  useDockRequest(!hideTabBar);

  return (
    <div className={'app-shell' + (hideTabBar ? '' : ' app-shell-with-tabs') + (bleed ? ' app-shell-bleed' : '')} data-surface={surface}>
      <main className="app-shell-main" ref={mainRef}>
        {children}
      </main>
    </div>
  );
}
