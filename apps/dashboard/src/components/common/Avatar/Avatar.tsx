import { initialsOf } from './initials';
import { AvatarImage } from '../AvatarImage/AvatarImage';
import './Avatar.css';

const TINTS = ['pink', 'lilac', 'peach', 'sky'] as const;

interface AvatarProps {
  name: string;
  /** Keeps a person's tint the same everywhere (her id); without it the name decides. */
  seed?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Her profile photo's signed link; initials when missing or expired. */
  photoUrl?: string | null;
}

function tintOf(seed: string): (typeof TINTS)[number] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

/** Her photo, or initials on a soft tint. Decorative: the name is always written next to it. */
export function Avatar({ name, seed, size = 'md', photoUrl }: AvatarProps) {
  return (
    <span className={`avatar avatar-${size} avatar-${tintOf(seed ?? name)}`} aria-hidden="true">
      {initialsOf(name)}
      <AvatarImage url={photoUrl} />
    </span>
  );
}
