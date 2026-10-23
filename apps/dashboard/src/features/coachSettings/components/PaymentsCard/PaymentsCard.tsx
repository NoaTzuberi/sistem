import { fill, useCopy } from '@sistem/shared';
import { WidgetCard } from '../../../../components/common/WidgetCard/WidgetCard';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { PaymentPreview } from '../PaymentPreview/PaymentPreview';
import { useCoachPayment } from '../../hooks/useCoachPayment';
import { MAX_PAYMENT_NOTE } from '../../data/paymentForm';
import { coachSettingsCopy } from '../../copy';
import './PaymentsCard.css';

/** "Payments": her PayBox link, Bit number and a note — with a live preview of her trainees' coach card. */
export function PaymentsCard({ onToast }: { onToast: (text: string) => void }) {
  const copy = useCopy(coachSettingsCopy).payments;
  const payment = useCoachPayment(onToast);
  const { form } = payment;

  return (
    <WidgetCard title={copy.title} subtitle={copy.helper} className="pay-card">
      {payment.loadError ? (
        <StateLine error={payment.loadError} />
      ) : (
        <div className="pay-card-body">
          <form
            className="pay-form"
            onSubmit={(event) => {
              event.preventDefault();
              void payment.save();
            }}
            noValidate
          >
            <label className="pay-field">
              <span className="pay-field-label">{copy.paybox}</span>
              <input
                className="pay-input"
                type="url"
                inputMode="url"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                placeholder={copy.payboxPlaceholder}
                value={form.payboxUrl}
                disabled={!payment.isLoaded}
                onChange={(event) => payment.change({ payboxUrl: event.target.value })}
              />
              <span className="pay-field-hint">{copy.payboxHint}</span>
            </label>
            <label className="pay-field">
              <span className="pay-field-label">{copy.bit}</span>
              <input
                className="pay-input"
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="off"
                value={form.bitPhone}
                disabled={!payment.isLoaded}
                onChange={(event) => payment.change({ bitPhone: event.target.value })}
              />
              <span className="pay-field-hint">{copy.bitHint}</span>
            </label>
            <label className="pay-field">
              <span className="pay-field-label">{copy.note}</span>
              <textarea
                className="pay-input pay-textarea"
                dir="auto"
                rows={2}
                maxLength={MAX_PAYMENT_NOTE}
                value={form.note}
                placeholder={copy.noteHint}
                disabled={!payment.isLoaded}
                onChange={(event) => payment.change({ note: event.target.value })}
              />
              <span className="pay-field-hint" dir="ltr">
                {fill(copy.noteCount, { count: form.note.length, max: MAX_PAYMENT_NOTE })}
              </span>
            </label>
            {payment.saveError && (
              <p className="pay-error" role="alert">
                {payment.saveError}
              </p>
            )}
            <div className="pay-actions">
              <PillButton type="submit" variant="primary" disabled={!payment.isDirty || payment.isSaving}>
                {payment.isSaving ? copy.saving : copy.save}
              </PillButton>
            </div>
            <p className="pay-future">{copy.future}</p>
          </form>
          <PaymentPreview form={form} />
        </div>
      )}
    </WidgetCard>
  );
}
