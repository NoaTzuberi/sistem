import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { useId } from 'react';
import './LoginField.css';

interface LoginFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Read by screen readers only — the placeholder is what she sees. */
  label: string;
  icon: ReactNode;
  /** A control inside the pill, after the input (the show / hide password toggle). */
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/** The pill input of the login card: round white icon chip, input, optional trailing control. */
export function LoginField({ label, icon, trailing, id, ...rest }: LoginFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="login-field">
      <span className="login-field-icon" aria-hidden="true">
        {icon}
      </span>
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>
      <input id={inputId} className="login-field-input" placeholder={label} {...rest} />
      {trailing}
    </div>
  );
}
