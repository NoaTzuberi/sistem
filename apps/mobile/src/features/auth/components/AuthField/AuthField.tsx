import type { FocusEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import './AuthField.css';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Shown above the field. */
  label: string;
  error?: string;
  statusText?: string;
  helperText?: string;
  /** A control inside the pill, after the input (the "forgot" link). */
  trailing?: ReactNode;
}

// Same wait as common/Input: the keyboard opens after focus and shrinks the screen.
const KEYBOARD_OPEN_DELAY_MS = 300;

/** A field of the signed-out screens' white card: label above, soft fill, optional trailing control (the eye). */
export function AuthField({ label, error, statusText, helperText, trailing, id, onFocus, ...rest }: AuthFieldProps) {
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
      <label className="auth-field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className={'auth-field' + (error ? ' auth-field-invalid' : '')}>
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
