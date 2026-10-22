import { useState } from 'react';
import './AvatarPhoto.css';

interface AvatarPhotoProps {
  url: string | null;
  /** The signed link stopped working (expired): ask for a fresh one. */
  onExpired?: () => void;
}

/**
 * Her profile photo over the initials (Profile, Home) (the parent is round, relative and clipped). A link that
 * fails leaves the initials and asks for a fresh one. Decorative — her name is always next to it.
 */
export function AvatarPhoto({ url, onExpired }: AvatarPhotoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) return null;
  return (
    <img
      className="avatar-photo"
      src={url}
      alt=""
      decoding="async"
      onError={() => {
        setFailedUrl(url);
        onExpired?.();
      }}
    />
  );
}
