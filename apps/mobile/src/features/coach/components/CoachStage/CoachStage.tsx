import type { ReactNode } from 'react';
import './CoachStage.css';

interface CoachStageProps {
  children: ReactNode;
  labelledBy?: string;
}

/** The coach mode stage: ink, faint vertical grid lines, the pink → purple accent bar along the bottom. */
export function CoachStage({ children, labelledBy }: CoachStageProps) {
  return (
    <section className="coach-stage" aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
