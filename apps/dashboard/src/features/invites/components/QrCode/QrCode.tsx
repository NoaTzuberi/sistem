import { useQrCode } from '../../hooks/useQrCode';
import './QrCode.css';

interface QrCodeProps {
  url: string;
  label: string;
}

/** The join link as a scannable square (drawn from the tokens' colors). */
export function QrCode({ url, label }: QrCodeProps) {
  const image = useQrCode(url);
  return <div className="qr-code">{image ? <img className="qr-code-image" src={image} alt={label} /> : <span className="qr-code-placeholder" aria-hidden="true" />}</div>;
}
