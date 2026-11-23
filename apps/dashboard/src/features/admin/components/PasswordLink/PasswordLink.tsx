import { useState } from 'react';
import type { AdminUserResetLinkResponse, CoachPasswordLinkResponse } from '@sistem/types';
import { dateFormat, fill, useCopy, useLanguage } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Icon } from '../../../../components/common/Icon/Icon';
import { useClipboard } from '../../../../hooks/useClipboard';
import { adminCopy } from '../../copy';
import './PasswordLink.css';

interface PasswordLinkProps {
  /** A coach's set-password / reset link, or the account search's reset link (any account). */
  result: CoachPasswordLinkResponse | AdminUserResetLinkResponse;
}

/**
 * A one-time set-password or reset link, shown once: the link to copy, until when it works, and
 * whether it was emailed (coach links) or where it opens (account links). Kept only in the page's state.
 */
export function PasswordLink({ result }: PasswordLinkProps) {
  const copy = useCopy(adminCopy);
  const language = useLanguage();
  const copyText = useClipboard();
  const [isCopied, setIsCopied] = useState(false);
  const until = dateFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.expiresAt));
  const isAccountLink = 'app' in result;
  const url = isAccountLink ? result.url : result.setPasswordUrl;
  const isReset = isAccountLink || result.kind === 'reset_password';
  const title = isReset ? copy.resetLinkTitle : copy.linkTitle;
  const notes = isAccountLink
    ? [result.app === 'app' ? copy.userResetOpensApp : copy.userResetOpensDashboard, copy.userResetNote]
    : [isReset ? copy.resetLinkCopyNote : result.emailSent ? copy.emailSent : copy.emailNotSent];

  async function handleCopy() {
    setIsCopied(await copyText(url));
  }

  return (
    <section className="password-link" aria-label={title}>
      <h3 className="password-link-title">{title}</h3>
      <div className="password-link-row">
        <input className="password-link-url" dir="ltr" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
        <PillButton variant="primary" size="sm" onClick={handleCopy}>
          <Icon name={isCopied ? 'check' : 'copy'} size="sm" />
          {isCopied ? copy.copied : copy.copyLink}
        </PillButton>
      </div>
      <p className="password-link-hint">{fill(isReset ? copy.resetLinkHint : copy.linkHint, { date: until })}</p>
      {notes.map((note) => (
        <p key={note} className="password-link-hint">
          {note}
        </p>
      ))}
    </section>
  );
}
