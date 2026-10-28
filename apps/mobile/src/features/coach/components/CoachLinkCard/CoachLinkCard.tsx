import { useState } from 'react';
import { useCopy, useLoad } from '@sistem/shared';
import { getInvites } from '../../../../services/coach/coachService';
import { useToast } from '../../../../hooks/useToast';
import { Toast } from '../../../../components/common/Toast/Toast';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useCopyText } from '../../../profile/hooks/useCopyText';
import { coachCopy } from '../../copy';
import { CoachCard } from '../CoachCard/CoachCard';
import { InviteSheet } from '../InviteSheet/InviteSheet';
import './CoachLinkCard.css';

/** "הקישור שלי": her permanent invite link with copy, and "QR" → the invite sheet. */
export function CoachLinkCard() {
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

  return (
    <CoachCard title={copy.myLink}>
      {error && !data && <StateMessage onRetry={reload}>{error}</StateMessage>}
      {link && (
        <div className="coach-link-card-row">
          <span className="coach-link-card-url" dir="ltr">
            {link.url.replace(/^https?:\/\//, '')}
          </span>
          <button type="button" className="coach-link-card-copy" onClick={() => void handleCopy()}>
            {copy.copy}
          </button>
          <button type="button" className="coach-link-card-copy" aria-haspopup="dialog" onClick={() => setIsSheetOpen(true)}>
            {copy.qr}
          </button>
        </div>
      )}
      <InviteSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
      <Toast message={toastMessage} />
    </CoachCard>
  );
}
