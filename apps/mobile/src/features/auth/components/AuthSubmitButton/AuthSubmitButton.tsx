import type { ReactNode } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import './AuthSubmitButton.css';

interface AuthSubmitButtonProps {
  /** primary = the pink pill (one per card); secondary = the outlined pill, like the card's log in ↔ sign up switch. */
  variant?: 'primary' | 'secondary';
  /** submit inside the login / sign-up form; button for the join screen's actions. */
  type?: 'submit' | 'button';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

/** The full-width pill of the glass card; the pink one's arrow points along the reading direction. */
export function AuthSubmitButton({ variant = 'primary', type = 'submit', loading = false, disabled = false, onClick, children }: AuthSubmitButtonProps) {
  return (
    <button
      type={type}
      className={'auth-submit' + (variant === 'secondary' ? ' auth-submit-secondary' : '')}
      disabled={loading || disabled}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <>
          <span>{children}</span>
          {variant === 'primary' && <IconArrowRight className="flip-rtl" size={20} stroke={2.4} aria-hidden="true" />}
        </>
      )}
    </button>
  );
}
