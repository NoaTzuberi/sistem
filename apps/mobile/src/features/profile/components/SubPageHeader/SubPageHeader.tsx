import { useCopy } from '@sistem/shared';
import type { ReactNode } from 'react';
import { IconChevronLeft } from '@tabler/icons-react';
import { bodyCopy } from '../../../bodyTracking/copy';
import { useGoBack } from '../../hooks/useGoBack';
import './SubPageHeader.css';

interface SubPageHeaderProps {
  title: string;
  /** Where back goes when the screen was opened directly (no history to go back to). */
  fallbackPath: string;
  action?: ReactNode;
}

/** Back + title (+ one action) for the Profile sub-screens. */
export function SubPageHeader({ title, fallbackPath, action }: SubPageHeaderProps) {
  const copy = useCopy(bodyCopy);
  const goBack = useGoBack(fallbackPath);

  return (
    <header className="sub-page-header">
      <button className="sub-page-header-back" type="button" onClick={goBack} aria-label={copy.back}>
        <IconChevronLeft className="flip-rtl" size={24} aria-hidden="true" />
      </button>
      <h1 className="sub-page-header-title display-title">{title}</h1>
      {action && <div className="sub-page-header-action">{action}</div>}
    </header>
  );
}
