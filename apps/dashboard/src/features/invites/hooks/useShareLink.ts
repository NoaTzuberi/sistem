import { useState } from 'react';
import { useClipboard } from '../../../hooks/useClipboard';

/** Copy (with a short "copied" state) and the system share sheet where the browser has one. */
export function useShareLink() {
  const copyText = useClipboard();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function copy(url: string) {
    if (await copyText(url)) setCopiedUrl(url);
  }

  async function share(url: string, text: string) {
    try {
      await navigator.share({ text, url });
    } catch {
      // Cancelled by her, or not allowed: nothing to do.
    }
  }

  return { copy, share, canShare, copiedUrl };
}
