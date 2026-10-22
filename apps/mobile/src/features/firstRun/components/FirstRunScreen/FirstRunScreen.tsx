import type { ReactNode } from 'react';
import { IconChevronLeft } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { StepBar } from '../StepBar/StepBar';
import { firstRunCopy } from '../../copy';
import './FirstRunScreen.css';

interface FirstRunScreenProps {
  title: string;
  sub?: ReactNode;
  /** The step bar (first run only); joining later from the Profile has none. */
  step?: number;
  onBack?: () => void;
  /** A slim line above everything (the "joining <coach>" banner). */
  banner?: ReactNode;
  children: ReactNode;
}

/** The first-run screens' frame: the page surface, a round back button, the step bar, the Karantina title. */
export function FirstRunScreen({ title, sub, step, onBack, banner, children }: FirstRunScreenProps) {
  const copy = useCopy(firstRunCopy);
  return (
    <main className="fr-screen">
      {banner}
      <div className="fr-screen-inner">
        {onBack && (
          <button type="button" className="fr-back" onClick={onBack} aria-label={copy.back}>
            <IconChevronLeft className="flip-rtl" size={18} aria-hidden="true" />
          </button>
        )}
        {step !== undefined && <StepBar step={step} />}
        <h1 className="fr-title">{title}</h1>
        {sub && <p className="fr-sub">{sub}</p>}
        {children}
      </div>
    </main>
  );
}
