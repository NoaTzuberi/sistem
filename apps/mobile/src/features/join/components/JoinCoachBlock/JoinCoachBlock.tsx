import type { PrivatePhoto } from '@sistem/types';
import { AvatarPhoto } from '../../../../components/common/AvatarPhoto/AvatarPhoto';
import { initialsOf } from '../../../profile/data/profileDisplay';
import './JoinCoachBlock.css';

interface JoinCoachBlockProps {
  name: string;
  /** Signed out the server sends none: her initials. */
  avatar: PrivatePhoto | null;
  /** The line under her name. */
  line: string;
}

/** Who invites her: the coach's photo (or initials) in a pink ring, her name, one muted line. */
export function JoinCoachBlock({ name, avatar, line }: JoinCoachBlockProps) {
  return (
    <div className="join-coach">
      <span className="join-coach-avatar" aria-hidden="true">
        {initialsOf(name)}
        <AvatarPhoto url={avatar?.url ?? null} />
      </span>
      <h1 className="join-coach-name display-title" dir="auto">
        <bdi>{name}</bdi>
      </h1>
      <p className="join-coach-line">{line}</p>
    </div>
  );
}
