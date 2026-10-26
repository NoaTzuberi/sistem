import { Resend } from 'resend';
import type { Language } from '@sistem/types';
import { config } from '../../config/env';
import { translate } from '../../i18n';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

/** In her language (Phase 15): Hebrew right-to-left, or English. */
export async function sendPasswordResetEmail(to: string, resetUrl: string, language: Language): Promise<void> {
  if (!resend) {
    console.warn('RESEND_API_KEY is not configured — skipping password reset email send.');
    return;
  }

  const t = (code: Parameters<typeof translate>[1]) => translate(language, code);
  const dir = language === 'he' ? 'rtl' : 'ltr';
  await resend.emails.send({
    from: config.emailFrom,
    to,
    subject: t('email_reset_subject'),
    // Email clients can't read CSS variables: these are the exact token values (tokens.css —
    // --color-text, --color-primary, --color-on-primary, --color-text-muted).
    html: `
      <div dir="${dir}" lang="${language}" style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #26222a; text-align: start;">
        <h2 style="margin-bottom: 8px;">${t('email_reset_title')}</h2>
        <p>${t('email_reset_body')}</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #ff006e; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${t('email_reset_button')}</a>
        </p>
        <p style="color: #6b6b6b;">${t('email_reset_ignore')}</p>
      </div>
    `,
  });
}

/**
 * The coach dashboard's reset link (coach / admin accounts). Returns false when it did not go out
 * (no Resend key, or Resend refused it) — the caller never logs the link outside development.
 */
export async function sendDashboardResetEmail(to: string, url: string, language: Language): Promise<boolean> {
  if (!resend) return false;
  const t = (code: Parameters<typeof translate>[1]) => translate(language, code);
  const dir = language === 'he' ? 'rtl' : 'ltr';
  // Resend reports failures in the result (it does not throw). Exact token values (email clients
  // can't read CSS variables) — same as the reset email above.
  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to,
    subject: t('email_dashboard_reset_subject'),
    html: `
      <div dir="${dir}" lang="${language}" style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #26222a; text-align: start;">
        <h2 style="margin-bottom: 8px;">${t('email_dashboard_reset_title')}</h2>
        <p>${t('email_dashboard_reset_body')}</p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background-color: #ff006e; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${t('email_dashboard_reset_button')}</a>
        </p>
        <p>${t('email_dashboard_reset_expiry')}</p>
        <p style="color: #6b6b6b;">${t('email_dashboard_reset_ignore')}</p>
      </div>
    `,
  });
  if (error) {
    console.error('Resend refused the dashboard reset email:', error.name);
    return false;
  }
  return true;
}

/** The admin's one-time link to a new coach. Returns false when email is not configured (the admin copies the link). */
export async function sendSetPasswordEmail(to: string, url: string, hours: number, language: Language): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY is not configured — skipping the set-password email.');
    return false;
  }
  const t = (code: Parameters<typeof translate>[1]) => translate(language, code);
  const dir = language === 'he' ? 'rtl' : 'ltr';
  // Resend reports failures in the result (it does not throw): the admin then copies the link.
  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to,
    subject: t('email_set_password_subject'),
    // Exact token values (email clients can't read CSS variables) — same as the reset email.
    html: `
      <div dir="${dir}" lang="${language}" style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #26222a; text-align: start;">
        <h2 style="margin-bottom: 8px;">${t('email_set_password_title')}</h2>
        <p>${t({ code: 'email_set_password_body', params: { hours } })}</p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background-color: #ff006e; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${t('email_set_password_button')}</a>
        </p>
      </div>
    `,
  });
  if (error) {
    console.error('Resend refused the set-password email:', error.name);
    return false;
  }
  return true;
}
