import { useEffect, useState } from 'react';
import { getActiveLanguage } from '@sistem/shared';
import { getPayment, savePayment } from '../../../services/coachProfile/coachPaymentService';
import { coachSettingsCopy } from '../copy';
import { isSameForm, toForm } from '../data/paymentForm';
import type { PaymentForm } from '../data/paymentForm';

const EMPTY: PaymentForm = { payboxUrl: '', bitPhone: '', note: '' };

/** Her payment links: loaded once, edited in the form, saved together (the server's checks decide). */
export function useCoachPayment(onSaved: (text: string) => void) {
  const [saved, setSaved] = useState<PaymentForm | null>(null);
  const [form, setForm] = useState<PaymentForm>(EMPTY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getPayment()
      .then((payment) => {
        if (!isCurrent) return;
        setSaved(toForm(payment));
        setForm(toForm(payment));
      })
      .catch(() => isCurrent && setLoadError(coachSettingsCopy[getActiveLanguage()].payments.loadError));
    return () => {
      isCurrent = false;
    };
  }, []);

  async function save() {
    const copy = coachSettingsCopy[getActiveLanguage()].payments;
    setIsSaving(true);
    setSaveError(null);
    try {
      const payment = await savePayment({ payboxUrl: form.payboxUrl, bitPhone: form.bitPhone, note: form.note });
      setSaved(toForm(payment));
      setForm(toForm(payment));
      onSaved(copy.saved);
    } catch (caught) {
      setSaveError((caught instanceof Error && caught.message) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    form,
    change: (patch: Partial<PaymentForm>) => {
      setSaveError(null);
      setForm((current) => ({ ...current, ...patch }));
    },
    isLoaded: saved !== null,
    isDirty: saved !== null && !isSameForm(saved, form),
    loadError,
    saveError,
    isSaving,
    save,
  };
}
