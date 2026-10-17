import { createContext, useContext } from 'react';
import type { ScreenPhase } from '../../../hooks/useScreenTransition';

/** Which part a screen plays in a tab transition (AppShell skips its own enter animation while 'enter'). */
export const ScreenPhaseContext = createContext<ScreenPhase>('current');

export function useScreenPhase(): ScreenPhase {
  return useContext(ScreenPhaseContext);
}
