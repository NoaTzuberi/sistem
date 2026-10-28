import { IconShare } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { useToast } from '../../../../hooks/useToast';
import { coachCopy } from '../../copy';
import { useInvite } from '../../hooks/useInvite';
import { useQrCode } from '../../hooks/useQrCode';
import { CoachSheet } from '../CoachSheet/CoachSheet';
import { SheetButton, SheetButtonRow } from '../SheetButton/SheetButton';
import './InviteSheet.css';

interface InviteSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/** "הזמנת מתאמנת": the QR of her join link, the link + copy, share, and a personal single-use link. */
export function InviteSheet({ isOpen, onClose }: InviteSheetProps) {
  const copy = useCopy(coachCopy).invite;
  // The app's toast sits under a sheet: the sheet says it itself.
  const { toastMessage, showToast } = useToast();
  const invite = useInvite(isOpen, showToast);
  const qr = useQrCode(invite.link?.url ?? null);

  return (
    <CoachSheet isOpen={isOpen} onClose={onClose} title={copy.title} subtitle={copy.text}>
      {invite.loadError && !invite.link && <StateMessage onRetry={() => void invite.reload()}>{copy.loadError}</StateMessage>}
      <div className="ci-qr">{qr && <img className="ci-qr-image" src={qr} alt={copy.qrLabel} />}</div>
      {invite.link && (
        // The whole row is left to right (an address, then its button), in both languages.
        <div className="ci-link" dir="ltr" aria-label={invite.isPersonal ? copy.personalLabel : copy.linkLabel} role="group">
          <span className="ci-link-url">
            {invite.link.url.replace(/^https?:\/\//, '')}
          </span>
          <button type="button" className="ci-link-copy" dir="auto" onClick={() => void invite.copy()}>
            {copy.copy}
          </button>
        </div>
      )}
      <SheetButtonRow>
        <SheetButton variant="primary" icon={<IconShare size={16} stroke={2} aria-hidden="true" />} disabled={!invite.link} onClick={() => void invite.share()}>
          {copy.share}
        </SheetButton>
        <SheetButton disabled={invite.isCreating || invite.isPersonal} aria-busy={invite.isCreating} onClick={() => void invite.createPersonal()}>
          {copy.personal}
        </SheetButton>
      </SheetButtonRow>
      <p className="ci-status" role="status">
        {toastMessage}
      </p>
    </CoachSheet>
  );
}
