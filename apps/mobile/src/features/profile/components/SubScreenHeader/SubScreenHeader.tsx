import { IconChevronLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useCopy } from '@sistem/shared';
import { bodyCopy } from '../../../bodyTracking/copy';
import { useGoBack } from '../../hooks/useGoBack';
import './SubScreenHeader.css';

interface SubScreenHeaderProps {
  title: string;
  /** Where back goes when the screen was opened directly (no history). */
  fallbackPath: string;
  /** The muted line under the title. */
  subtitle?: ReactNode;
  /** A pill at the end of the back button's row (e.g. "Add"). */
  action?: ReactNode;
}

/**
 * The sticky top bar of the Profile's direction-B sub-screens ("השאלון שלי", "הגדרות"): a round back
 * button at the start (its chevron points the way back: right in Hebrew), the Karantina title under it.
 */
export function SubScreenHeader({ title, fallbackPath, subtitle, action }: SubScreenHeaderProps) {
  const copy = useCopy(bodyCopy);
  const goBack = useGoBack(fallbackPath);
  return (
    <header className="ssh">
      <div className="ssh-row">
        <button type="button" className="ssh-back" onClick={goBack} aria-label={copy.back}>
          <span className="ssh-back-disc" aria-hidden="true">
            <IconChevronLeft className="flip-rtl" size={20} />
          </span>
        </button>
        {action}
      </div>
      <h1 className="ssh-title display-title">{title}</h1>
      {subtitle && <p className="ssh-subtitle">{subtitle}</p>}
    </header>
  );
}
