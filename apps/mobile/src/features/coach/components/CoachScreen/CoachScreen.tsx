import type { ReactNode } from 'react';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import './CoachScreen.css';

interface CoachScreenProps {
  children: ReactNode;
  /** The screen's top (the ink stage, or a large title) — drawn edge to edge. */
  top: ReactNode;
}

/** A coach mode screen: full bleed on the soft page surface; content sits on white cards inside the gutter. */
export function CoachScreen({ top, children }: CoachScreenProps) {
  return (
    <AppShell bleed>
      <div className="coach-screen">
        {top}
        <div className="coach-screen-body">{children}</div>
      </div>
    </AppShell>
  );
}
