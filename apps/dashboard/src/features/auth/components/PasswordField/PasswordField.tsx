import type { InputHTMLAttributes, PointerEvent } from 'react';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../../copy';
import { LoginField } from '../LoginField/LoginField';
import { EyeIcon, EyeOffIcon, LockIcon } from '../LoginIcons/LoginIcons';
import type { PasswordVisibility } from '../../hooks/usePasswordVisibility';
import './PasswordField.css';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'dir'> {
  label: string;
  /** This field's own usePasswordVisibility(). */
  visibility: PasswordVisibility;
  autoComplete: 'current-password' | 'new-password';
}

/** Every dashboard password field: the login pill + an eye toggle at the inline end. */
export function PasswordField({ label, visibility, ...rest }: PasswordFieldProps) {
  const copy = useCopy(appCopy).passwordField;

  // Pointer press: keep the focus (and the caret) in the input. Keyboard: the button keeps its focus.
  function keepInputFocus(event: PointerEvent<HTMLButtonElement>) {
    if (document.activeElement === visibility.inputRef.current) event.preventDefault();
  }

  return (
    <LoginField
      {...rest}
      ref={visibility.inputRef}
      label={label}
      icon={<LockIcon />}
      type={visibility.isVisible ? 'text' : 'password'}
      dir="ltr"
      // A shown password is still a password: no spell check / autocorrect sending it anywhere.
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      trailing={
        <button
          type="button"
          className="pw-toggle"
          aria-label={visibility.isVisible ? copy.hide : copy.show}
          aria-pressed={visibility.isVisible}
          onPointerDown={keepInputFocus}
          onClick={visibility.toggle}
        >
          {visibility.isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}
