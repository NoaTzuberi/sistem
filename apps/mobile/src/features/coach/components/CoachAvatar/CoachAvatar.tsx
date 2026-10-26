import { AvatarPhoto } from '../../../../components/common/AvatarPhoto/AvatarPhoto';
import { initialsOf } from '../../../home/data/homeDisplay';
import { traineeColorClass } from '../../data/coachMode';
import './CoachAvatar.css';

interface CoachAvatarProps {
  name: string;
  /** Her id: keeps her color the same on every screen. */
  seed: string;
  photoUrl?: string | null;
  size?: 'md' | 'lg' | 'xl';
  /** Ink initials on white (the coach's own avatar on the stage) instead of her color. */
  plain?: boolean;
  onPhotoExpired?: () => void;
}

/** Initials on her color (or her photo over them). Decorative — her name is always written next to it. */
export function CoachAvatar({ name, seed, photoUrl, size = 'md', plain = false, onPhotoExpired }: CoachAvatarProps) {
  return (
    <span className={`coach-avatar coach-avatar-${size} ${plain ? 'coach-avatar-plain' : traineeColorClass(seed)}`} aria-hidden="true">
      <bdi>{initialsOf(name)}</bdi>
      <AvatarPhoto url={photoUrl ?? null} onExpired={onPhotoExpired} />
    </span>
  );
}
