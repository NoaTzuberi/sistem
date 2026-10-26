import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useCopy } from '@sistem/shared';
import { appCopy } from '../../../../copy';
import { ROUTES } from '../../../../app/config/routes';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PasswordCard } from '../../components/PasswordCard/PasswordCard';
import { PasswordField } from '../../components/PasswordField/PasswordField';
import { usePasswordReset } from '../../hooks/usePasswordReset';
import { usePasswordVisibility } from '../../hooks/usePasswordVisibility';
import './ResetPasswordPage.css';

/** The emailed (or admin-copied) link: choose a new password → back to login. */
export function ResetPasswordPage() {
  const copy = useCopy(appCopy).passwordReset;
  const passwordVisibility = usePasswordVisibility();
  const confirmVisibility = usePasswordVisibility();
  const form = usePasswordReset(() => {
    passwordVisibility.hide();
    confirmVisibility.hide();
  });
  const rulesId = useId();
  const passwordErrorId = useId();
  const confirmErrorId = useId();

  if (form.linkState === 'checking') {
    return (
      <PasswordCard title={copy.resetTitle} stateKey="checking">
        <p className="pw-text" role="status">
          {copy.checking}
        </p>
      </PasswordCard>
    );
  }

  if (form.linkState === 'invalid') {
    return (
      <PasswordCard title={copy.invalidTitle} stateKey="invalid">
        <p className="pw-text">{copy.invalidText}</p>
        <Link className="pw-submit" to={ROUTES.FORGOT_PASSWORD}>
          {copy.newLink}
        </Link>
        <Link className="pw-back" to={ROUTES.LOGIN}>
          {copy.toLogin}
        </Link>
      </PasswordCard>
    );
  }

  if (form.linkState === 'done') {
    return (
      <PasswordCard title={copy.doneTitle} stateKey="done">
        <p className="pw-text" role="status">
          {copy.doneText}
        </p>
        <Link className="pw-submit" to={ROUTES.LOGIN} replace>
          {copy.toLoginButton}
        </Link>
      </PasswordCard>
    );
  }

  const rules = [
    { met: form.isLongEnough, label: copy.ruleLength },
    { met: form.isMatching, label: copy.ruleMatch },
  ];

  return (
    <PasswordCard title={copy.resetTitle} stateKey="form">
      <form className="pw-form" onSubmit={form.submit} noValidate>
        <p className="pw-text">{copy.resetText}</p>
        <PasswordField
          label={copy.newPassword}
          visibility={passwordVisibility}
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => form.setPassword(event.target.value)}
          aria-invalid={Boolean(form.passwordError)}
          aria-describedby={form.passwordError ? `${rulesId} ${passwordErrorId}` : rulesId}
          required
        />
        {form.passwordError && (
          <p className="pw-error" id={passwordErrorId} role="alert">
            {form.passwordError}
          </p>
        )}
        <PasswordField
          label={copy.confirm}
          visibility={confirmVisibility}
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => form.setConfirm(event.target.value)}
          aria-invalid={Boolean(form.confirmError)}
          aria-describedby={form.confirmError ? confirmErrorId : undefined}
          required
        />
        {form.confirmError && (
          <p className="pw-error" id={confirmErrorId} role="alert">
            {form.confirmError}
          </p>
        )}
        <ul className="pw-rules reset-password-rules" id={rulesId}>
          {rules.map((rule) => (
            <li className={rule.met ? 'pw-rule is-met' : 'pw-rule'} key={rule.label}>
              <span className="pw-rule-mark" aria-hidden="true">
                {rule.met ? <Icon name="check" size="sm" /> : <span className="pw-rule-dot" />}
              </span>
              {rule.label}
            </li>
          ))}
        </ul>
        {form.error && (
          <p className="pw-error" role="alert">
            {form.error}
          </p>
        )}
        <button className="pw-submit" type="submit" disabled={form.isSaving}>
          {form.isSaving ? copy.saving : copy.save}
        </button>
      </form>
      <Link className="pw-back" to={ROUTES.LOGIN}>
        {copy.toLogin}
      </Link>
    </PasswordCard>
  );
}
