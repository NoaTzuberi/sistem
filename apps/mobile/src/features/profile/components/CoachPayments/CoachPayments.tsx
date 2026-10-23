import { IconCopy, IconExternalLink } from '@tabler/icons-react';
import type { CoachPayment } from '@sistem/types';
import { getActiveLanguage, useCopy } from '@sistem/shared';
import { profileCopy } from '../../copy';
import { formatIsraeliMobile, safePaymentUrl } from '../../data/paymentDisplay';
import { useCopyText } from '../../hooks/useCopyText';
import './CoachPayments.css';

interface CoachPaymentsProps {
  payment: CoachPayment;
  onToast: (text: string) => void;
}

/**
 * Her coach's payment links (temporary, until real payments): PayBox opens outside the app, the Bit number
 * is copied (no official Bit link exists, so none is faked), her note. The app never processes a payment.
 */
export function CoachPayments({ payment, onToast }: CoachPaymentsProps) {
  const copy = useCopy(profileCopy).payment;
  const copyText = useCopyText();
  const payboxUrl = safePaymentUrl(payment.payboxUrl);

  async function copyPhone(phone: string) {
    const text = profileCopy[getActiveLanguage()].payment;
    onToast((await copyText(phone)) ? text.copied : text.copyFailed);
  }

  return (
    <div className="pay-block">
      {payboxUrl && (
        <a className="pay-paybox" href={payboxUrl} target="_blank" rel="noopener noreferrer">
          {copy.paybox}
          <IconExternalLink size={16} aria-hidden="true" />
        </a>
      )}
      {payment.bitPhone && (
        <div className="pay-bit">
          <span className="pay-bit-label">{copy.bit}</span>
          <span className="pay-bit-phone" dir="ltr">
            {formatIsraeliMobile(payment.bitPhone)}
          </span>
          <button type="button" className="pay-bit-copy" onClick={() => void copyPhone(payment.bitPhone!)}>
            <IconCopy size={15} aria-hidden="true" />
            {copy.copy}
          </button>
        </div>
      )}
      {payment.note && (
        <p className="pay-note" dir="auto">
          {payment.note}
        </p>
      )}
      <p className="pay-direct">{copy.direct}</p>
    </div>
  );
}
