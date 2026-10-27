import type { ReactNode } from 'react';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import './AuthButton.css';

interface AuthButtonProps {
  /** primary = the pink pill (one per card); soft = the grey pill under it. */
  variant?: 'primary' | 'soft';
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

/** The full-width pill of the signed-out screens' white card. */
export function AuthButton({ variant = 'primary', type = 'button', loading = false, disabled = false, onClick, children }: AuthButtonProps) {
  return (
    <button
      type={type}
      className={`auth-button auth-button-${variant}`}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
