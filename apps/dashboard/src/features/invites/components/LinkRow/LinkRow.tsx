import type { ReactNode } from 'react';
import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { invitesCopy } from '../../copy';
import { useShareLink } from '../../hooks/useShareLink';
import './LinkRow.css';

interface LinkRowProps {
  url: string;
  /** Extra actions after copy / share (revoke). */
  children?: ReactNode;
}

/** One link: the address (LTR, selectable) + copy + share. */
export function LinkRow({ url, children }: LinkRowProps) {
  const copy = useCopy(invitesCopy);
  const { copy: copyLink, share, canShare, copiedUrl } = useShareLink();
  const isCopied = copiedUrl === url;

  return (
    <div className="link-row">
      <input className="link-row-url" dir="ltr" readOnly value={url} aria-label={url} onFocus={(event) => event.currentTarget.select()} />
      <div className="link-row-actions">
        <PillButton size="sm" variant="fill" onClick={() => copyLink(url)}>
          <Icon name={isCopied ? 'check' : 'copy'} size="sm" />
          {isCopied ? copy.copied : copy.copy}
        </PillButton>
        {canShare && (
          <PillButton size="sm" variant="fill" onClick={() => share(url, copy.shareText)}>
            <Icon name="send" size="sm" flip />
            {copy.share}
          </PillButton>
        )}
        {children}
      </div>
    </div>
  );
}
