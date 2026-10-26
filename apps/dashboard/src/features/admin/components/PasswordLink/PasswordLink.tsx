import { useState } from 'react';
import type { CoachPasswordLinkResponse } from '@sistem/types';
import { dateFormat, fill, useCopy, useLanguage } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { Icon } from '../../../../components/common/Icon/Icon';
import { useClipboard } from '../../../../hooks/useClipboard';
import { adminCopy } from '../../copy';
import './PasswordLink.css';

interface PasswordLinkProps {
  result: CoachPasswordLinkResponse;
}

/** A one-time set-password or reset link, shown once: the link to copy, until when it works, and whether it was emailed. */
export function PasswordLink({ result }: PasswordLinkProps) {
  const copy = useCopy(adminCopy);
  const language = useLanguage();
  const copyText = useClipboard();
  const [isCopied, setIsCopied] = useState(false);
  const until = dateFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.expiresAt));
  const isReset = result.kind === 'reset_password';
  const title = isReset ? copy.resetLinkTitle : copy.linkTitle;

  async function handleCopy() {
    setIsCopied(await copyText(result.setPasswordUrl));
  }

  return (
    <section className="password-link" aria-label={title}>
      <h3 className="password-link-title">{title}</h3>
      <div className="password-link-row">
        <input className="password-link-url" dir="ltr" readOnly value={result.setPasswordUrl} onFocus={(event) => event.currentTarget.select()} />
        <PillButton variant="primary" size="sm" onClick={handleCopy}>
          <Icon name={isCopied ? 'check' : 'copy'} size="sm" />
          {isCopied ? copy.copied : copy.copyLink}
        </PillButton>
      </div>
      <p className="password-link-hint">{fill(isReset ? copy.resetLinkHint : copy.linkHint, { date: until })}</p>
      <p className="password-link-hint">{isReset ? copy.resetLinkCopyNote : result.emailSent ? copy.emailSent : copy.emailNotSent}</p>
    </section>
  );
}
