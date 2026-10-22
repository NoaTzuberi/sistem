import { useState } from 'react';
import './AvatarImage.css';

interface AvatarImageProps {
  /** Her profile photo's signed link, or null = initials only. */
  url: string | null | undefined;
}

/**
 * A trainee's profile photo laid over her initials (the parent is round, relative, clipped).
 * The link is signed and expires after an hour: a failed load just leaves the initials, and the
 * next refresh of the trainee data brings a fresh link. Decorative — her name is always next to it.
 */
export function AvatarImage({ url }: AvatarImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) return null;
  return <img className="avatar-image" src={url} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />;
}
