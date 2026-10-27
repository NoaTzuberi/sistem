import type { FocusEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import './AuthField.css';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Read by screen readers only — the placeholder is what she sees. */
  label: string;
  icon: ReactNode;
  error?: string;
  statusText?: string;
  helperText?: string;
  /** A control inside the pill, after the input (the "forgot" link). */
  trailing?: ReactNode;
}

// Same wait as common/Input: the keyboard opens after focus and shrinks the screen.
const KEYBOARD_OPEN_DELAY_MS = 300;

/** The pill input of the login / sign-up card: round icon chip, input, optional trailing control. */
export function AuthField({ label, icon, error, statusText, helperText, trailing, id, onFocus, ...rest }: AuthFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const noteId = `${inputId}-note`;
  const note = error ?? statusText ?? helperText;

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    onFocus?.(event);
    const field = event.currentTarget;
    window.setTimeout(() => {
      if (document.activeElement === field) {
        field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, KEYBOARD_OPEN_DELAY_MS);
  }

  return (
    <div className="auth-field-group">
      <div className={'auth-field' + (error ? ' auth-field-invalid' : '')}>
        <span className="auth-field-icon" aria-hidden="true">
          {icon}
        </span>
        <label className="auth-field-label" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          className="auth-field-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          onFocus={handleFocus}
          {...rest}
        />
        {trailing}
      </div>
      {note && (
        <span id={noteId} className={error ? 'auth-field-error' : statusText ? 'auth-field-status' : 'auth-field-helper'}>
          {note}
        </span>
      )}
    </div>
  );
}
