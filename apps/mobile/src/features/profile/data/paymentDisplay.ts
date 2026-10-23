// Coach payment links on her coach card (pure). The server already checks them; the app checks the
// link once more before opening it (https only — never javascript: or anything else).

export function safePaymentUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

/** 0501234567 → "050-123-4567" (shown left to right). */
export function formatIsraeliMobile(phone: string): string {
  return /^05\d{8}$/.test(phone) ? `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}` : phone;
}
