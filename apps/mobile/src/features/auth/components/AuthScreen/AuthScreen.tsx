import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { TrackBackground } from '../../../../components/common/TrackBackground/TrackBackground';
import { Logo } from '../../../../components/common/Logo/Logo';
import { LanguageSwitch } from '../../../../components/common/LanguageSwitch/LanguageSwitch';
import { useAuthEntrance } from '../../hooks/useAuthEntrance';
import { useAuthSurface } from '../../hooks/useAuthSurface';
import { authCopy } from '../../copy';
import './AuthScreen.css';

interface AuthScreenProps {
  /** The card's title; the join screen draws its own heading (the coach) and leaves it out. */
  title?: string;
  /** The pill next to the title that leads to the other screen (log in ↔ sign up); none on the join screens. */
  switchLabel?: string;
  switchTo?: string;
  /** A quiet line right under the card; it rises and fades in with the card. */
  footer?: ReactNode;
  /** A slim line at the very top (the "joining <coach>" banner of a coach's link). */
  banner?: ReactNode;
  children: ReactNode;
}

// The login / sign-up screen: track background, brand, glass card. Not inside PageLayout — its
// page-enter transform would pin the fixed background and fight the entrance timeline.
export function AuthScreen({ title, switchLabel, switchTo, footer, banner, children }: AuthScreenProps) {
  const copy = useCopy(authCopy);
  const { riseRef, intro } = useAuthEntrance<HTMLDivElement>();
  useAuthSurface();

  return (
    <div className="auth-screen">
      {banner}
      <TrackBackground intro={intro} />
      <main className="auth-screen-content">
        <header className="auth-screen-brand">
          <Logo size="lg" variant="onBrand" className="auth-screen-logo" />
          <p className="auth-screen-tagline">{copy.tagline}</p>
        </header>
        <div className="auth-screen-rise" ref={riseRef}>
          <section className="auth-glass-card">
            {title && (
              <div className="auth-glass-head">
                <h1 className="auth-glass-title display-title">{title}</h1>
                {switchTo && switchLabel && (
                  <Link className="auth-glass-switch" to={switchTo}>
                    {switchLabel}
                  </Link>
                )}
              </div>
            )}
            {children}
          </section>
          {footer}
          {/* Before login the device remembers the choice; after login her saved language wins (Phase 15). */}
          <div className="auth-screen-language">
            <LanguageSwitch />
          </div>
        </div>
      </main>
    </div>
  );
}
