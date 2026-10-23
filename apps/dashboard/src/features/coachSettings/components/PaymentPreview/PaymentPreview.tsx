import { useCopy } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { coachSettingsCopy } from '../../copy';
import { previewPhone, previewUrl } from '../../data/paymentForm';
import type { PaymentForm } from '../../data/paymentForm';
import './PaymentPreview.css';

/** A live copy of the payment block on the trainee's coach card (decoration only — nothing here works). */
export function PaymentPreview({ form }: { form: PaymentForm }) {
  const copy = useCopy(coachSettingsCopy).payments;
  const url = previewUrl(form.payboxUrl);
  const phone = previewPhone(form.bitPhone);
  const note = form.note.trim();

  return (
    <aside className="pay-preview" aria-label={copy.previewTitle}>
      <p className="pay-preview-title">{copy.previewTitle}</p>
      {!url && !phone && !note ? (
        <p className="pay-preview-empty">{copy.previewEmpty}</p>
      ) : (
        <div className="pay-preview-card" aria-hidden="true">
          {url && <span className="pay-preview-paybox">{copy.previewPaybox}</span>}
          {phone && (
            <span className="pay-preview-bit">
              <span className="pay-preview-bit-label">{copy.previewBit}</span>
              <span className="pay-preview-phone" dir="ltr">
                {phone}
              </span>
              <span className="pay-preview-copy">
                <Icon name="copy" size="sm" />
                {copy.previewCopy}
              </span>
            </span>
          )}
          {note && (
            <span className="pay-preview-note" dir="auto">
              {note}
            </span>
          )}
          <span className="pay-preview-direct">{copy.previewDirect}</span>
        </div>
      )}
    </aside>
  );
}
