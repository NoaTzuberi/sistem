import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from '../Spinner/Spinner';
import './PillButton.css';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 'primary' = the pink pill (white text); 'soft' = the soft grey pill (ink text). */
  variant?: 'primary' | 'soft';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

/** The direction-B full-width pill (56px): one primary action per screen, or a quiet soft one. */
export function PillButton({ variant = 'primary', loading = false, icon, disabled, className, children, type = 'button', ...rest }: PillButtonProps) {
  const classNames = ['pill-button', `pill-button-${variant}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classNames} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <>
          {icon && (
            <span className="pill-button-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
}
