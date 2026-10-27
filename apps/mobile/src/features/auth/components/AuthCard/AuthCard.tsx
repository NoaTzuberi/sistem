import type { ReactNode } from 'react';
import { Logo } from '../../../../components/common/Logo/Logo';
import { LanguageSwitch } from '../../../../components/common/LanguageSwitch/LanguageSwitch';
import './AuthCard.css';

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className="auth-card">
      <Logo size="lg" className="auth-card-logo" />
      <h1 className="auth-card-title display-title">{title}</h1>
      {children}
      {/* Before login the device remembers the choice; after login her saved language wins (Phase 15). */}
      <div className="auth-card-language">
        <LanguageSwitch />
      </div>
    </div>
  );
}
