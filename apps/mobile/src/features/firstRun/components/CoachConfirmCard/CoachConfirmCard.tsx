import { IconLock } from '@tabler/icons-react';
import type { PrivatePhoto } from '@sistem/types';
import { AvatarPhoto } from '../../../../components/common/AvatarPhoto/AvatarPhoto';
import { initialsOf } from '../../../profile/data/profileDisplay';
import './CoachConfirmCard.css';

interface CoachConfirmCardProps {
  name: string;
  avatar: PrivatePhoto | null;
  /** Discipline / city — only when the coach has them (not stored yet: see the report). */
  meta?: string | null;
  communities: string[];
  /** The access line ("<coach> will see …"). */
  access: string;
}

/** "Is this your coach?": a pink band, her photo (or initials) over it, her name, communities, who sees what. */
export function CoachConfirmCard({ name, avatar, meta, communities, access }: CoachConfirmCardProps) {
  return (
    <section className="fr-coach-card">
      <div className="fr-coach-band" aria-hidden="true" />
      <span className="fr-coach-avatar" aria-hidden="true">
        {initialsOf(name)}
        <AvatarPhoto url={avatar?.url ?? null} />
      </span>
      <h2 className="fr-coach-name" dir="auto">
        <bdi>{name}</bdi>
      </h2>
      {meta && (
        <p className="fr-coach-meta" dir="auto">
          {meta}
        </p>
      )}
      {communities.length > 0 && (
        <ul className="fr-coach-tags">
          {communities.map((community) => (
            <li key={community} className="fr-coach-tag" dir="auto">
              <bdi>{community}</bdi>
            </li>
          ))}
        </ul>
      )}
      <p className="fr-coach-access">
        <IconLock size={18} aria-hidden="true" className="fr-coach-lock" />
        <span>{access}</span>
      </p>
    </section>
  );
}
