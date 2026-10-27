import type { ReactNode } from 'react';
import type { PrivatePhoto } from '@sistem/types';
import { AvatarPhoto } from '../../../../components/common/AvatarPhoto/AvatarPhoto';
import { initialsOf } from '../../../profile/data/profileDisplay';
import './JoinCoachBlock.css';

interface JoinCoachBlockProps {
  name: string;
  /** Signed out the server sends none: her initials. */
  avatar: PrivatePhoto | null;
  /** The line under her name. */
  line: ReactNode;
}

/** The top of the join card: the coach's photo (or initials) in a white ring, her name, one line. */
export function JoinCoachBlock({ name, avatar, line }: JoinCoachBlockProps) {
  return (
    <div className="join-coach">
      <span className="join-coach-avatar" aria-hidden="true">
        {initialsOf(name)}
        <AvatarPhoto url={avatar?.url ?? null} />
      </span>
      <div className="join-coach-text">
        <h1 className="join-coach-name display-title">
          <bdi>{name}</bdi>
        </h1>
        <p className="join-coach-line">{line}</p>
      </div>
    </div>
  );
}
