import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import './AuthSubmitButton.css';

interface AuthSubmitButtonProps {
  /**
   * primary = the pink pill (one per card); secondary = the outlined pill, like the card's log in ↔ sign up
   * switch; soft = the white pill of a notice (a quiet way back).
   */
  variant?: 'primary' | 'secondary' | 'soft';
  /** submit inside the login / sign-up form; button for the join screen's actions. */
  type?: 'submit' | 'button';
  /** A route: drawn as a link with the same look (no loading state). */
  to?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

const VARIANT_CLASS = { primary: '', secondary: ' auth-submit-secondary', soft: ' auth-submit-soft' } as const;

/** The full-width pill of the glass card; the pink one's arrow points along the reading direction. */
export function AuthSubmitButton({ variant = 'primary', type = 'submit', to, loading = false, disabled = false, onClick, children }: AuthSubmitButtonProps) {
  const className = 'auth-submit' + VARIANT_CLASS[variant];
  const content = (
    <>
      <span>{children}</span>
      {variant === 'primary' && <IconArrowRight className="flip-rtl" size={20} stroke={2.4} aria-hidden="true" />}
    </>
  );

  if (to) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={className} disabled={loading || disabled} aria-busy={loading} onClick={onClick}>
      {loading ? <Spinner size="sm" /> : content}
    </button>
  );
}
