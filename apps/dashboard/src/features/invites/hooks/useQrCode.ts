import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** A design token's value (the QR is drawn on a canvas, which can't read CSS variables). */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The link as a QR image (data URL), in the theme's ink on the card color; null while drawing or for no link. */
export function useQrCode(url: string | null, size = 240): string | null {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    let isCurrent = true;
    QRCode.toDataURL(url, { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark: token('--color-text'), light: token('--color-card') } })
      .then((dataUrl) => {
        if (isCurrent) setImage(dataUrl);
      })
      .catch(() => {
        if (isCurrent) setImage(null);
      });
    return () => {
      isCurrent = false;
    };
  }, [url, size]);

  return image;
}
