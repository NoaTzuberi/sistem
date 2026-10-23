import type { CoachPayment } from '@sistem/types';

// The payment form (pure). The server validates and normalizes (https only, Israeli mobile → 05XXXXXXXX,
// note ≤ 140); the preview shows only what would pass the same basic shape.

export const MAX_PAYMENT_NOTE = 140;

export interface PaymentForm {
  payboxUrl: string;
  bitPhone: string;
  note: string;
}

export function toForm(payment: CoachPayment): PaymentForm {
  return { payboxUrl: payment.payboxUrl ?? '', bitPhone: payment.bitPhone ?? '', note: payment.note ?? '' };
}

/** The preview never shows a link that isn't https. */
export function previewUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function previewPhone(value: string): string | null {
  const local = value.replace(/[\s\-.()]/g, '').replace(/^\+?972/, '0');
  return /^05\d{8}$/.test(local) ? `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}` : null;
}

export function isSameForm(a: PaymentForm, b: PaymentForm): boolean {
  return a.payboxUrl.trim() === b.payboxUrl.trim() && a.bitPhone.trim() === b.bitPhone.trim() && a.note.trim() === b.note.trim();
}
