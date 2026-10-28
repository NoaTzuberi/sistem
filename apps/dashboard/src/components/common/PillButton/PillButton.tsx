import type { ButtonHTMLAttributes, Ref } from 'react';
import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import './PillButton.css';

/** soft = white on the canvas · primary = Neon Pink · fill = grey, inside a white card · dark = charcoal (a sheet's "Done") · danger = quiet red. */
/** danger = an error-red action · cherry = ending something the trainee feels (end coaching). */
export type PillButtonVariant = 'soft' | 'primary' | 'fill' | 'dark' | 'danger' | 'cherry';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillButtonVariant;
  size?: 'md' | 'sm';
  /** A link instead of a button (router state travels with it). */
  to?: To;
  state?: unknown;
  ref?: Ref<HTMLButtonElement>;
}

/** The dashboard's pill button (plan builder). Gives under the pointer; nothing else about it animates. */
export function PillButton({ variant = 'soft', size = 'md', type = 'button', to, state, className, children, ...rest }: PillButtonProps) {
  const classNames = ['pill-button', `pill-button-${variant}`, `pill-button-${size}`, className].filter(Boolean).join(' ');
  if (to !== undefined) {
    return (
      <Link className={classNames} to={to} state={state}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classNames} type={type} {...rest}>
      {children}
    </button>
  );
}
