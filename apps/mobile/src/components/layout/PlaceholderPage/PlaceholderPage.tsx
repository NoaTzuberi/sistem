import type { ReactNode } from 'react';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../copy';
import { AppShell } from '../AppShell/AppShell';
import './PlaceholderPage.css';

interface PlaceholderPageProps {
  title: string;
  children?: ReactNode;
}

// Stand-in for tab screens that are built in later phases. Placeholder copy only.
export function PlaceholderPage({ title, children }: PlaceholderPageProps) {
  const copy = useCopy(appCopy);
  return (
    <AppShell>
      <section className="placeholder-page">
        <h1 className="placeholder-page-title display-title">{title}</h1>
        <p className="placeholder-page-text">{copy.comingSoon}</p>
        {children}
      </section>
    </AppShell>
  );
}
