import { useState } from 'react';
import { IconQrcode } from '@tabler/icons-react';
import { useCopy, useLoad } from '@sistem/shared';
import { getInvites } from '../../../../services/coach/coachService';
import { useToast } from '../../../../hooks/useToast';
import { Toast } from '../../../../components/common/Toast/Toast';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useCopyText } from '../../../profile/hooks/useCopyText';
import { coachCopy } from '../../copy';
import { InviteSheet } from '../InviteSheet/InviteSheet';
import { ProfileRow } from '../ProfileRow/ProfileRow';
import './CoachLinkRow.css';

/** "קוד הזמנה / QR": her permanent invite link, "העתקה", and "QR" → the invite sheet. */
export function CoachLinkRow() {
  const copy = useCopy(coachCopy).profile;
  const { data, error, reload } = useLoad(getInvites, copy.linkError);
  const copyText = useCopyText();
  const { toastMessage, showToast } = useToast();
  const link = data?.permanent;
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  async function handleCopy() {
    if (!link) return;
    showToast((await copyText(link.url)) ? copy.copied : copy.copyFailed);
  }

  if (error && !data) {
    return (
      <li className="cp-row-item">
        <StateMessage onRetry={reload}>{error}</StateMessage>
      </li>
    );
  }

  return (
    <>
      <ProfileRow
        icon={<IconQrcode size={20} />}
        label={copy.linkRow}
        sub={
          link && (
            <bdi className="cp-link-url" dir="ltr">
              {link.url.replace(/^https?:\/\//, '')}
            </bdi>
          )
        }
        trailing={
          link && (
            <span className="cp-pills">
              <button type="button" className="cp-pill" onClick={() => void handleCopy()}>
                {copy.copy}
              </button>
              <button type="button" className="cp-pill" aria-haspopup="dialog" onClick={() => setIsSheetOpen(true)}>
                {copy.qr}
              </button>
            </span>
          )
        }
      />
      <InviteSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
      <Toast message={toastMessage} />
    </>
  );
}
