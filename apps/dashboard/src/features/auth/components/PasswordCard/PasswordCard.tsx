import type { ReactNode } from 'react';
import { FlowBackground } from '../../../../components/common/FlowBackground/FlowBackground';
import { LanguageToggle } from '../../../../components/common/LanguageToggle/LanguageToggle';
import { Logo } from '../../../../components/common/Logo/Logo';
import './PasswordCard.css';

interface PasswordCardProps {
  title: string;
  /** Changes when the card swaps content (form → sent / done / invalid): the new content fades in. */
  stateKey: string;
  children: ReactNode;
}

/** The forgot / reset password screens: one glass card over the flow lines, like the login card. */
export function PasswordCard({ title, stateKey, children }: PasswordCardProps) {
  return (
    <main className="pw-page">
      <FlowBackground />
      <LanguageToggle className="pw-language" />
      <section className="pw-card" aria-labelledby="pw-title">
        <div className="pw-logo-tile">
          <Logo variant="onBrand" />
        </div>
        <div className="pw-state" key={stateKey}>
          <h1 className="pw-title" id="pw-title">
            {title}
          </h1>
          {children}
        </div>
      </section>
    </main>
  );
}
