import { initialsOf } from '../../../../components/common/Avatar/initials';
import { AvatarImage } from '../../../../components/common/AvatarImage/AvatarImage';
import type { QuickViewStatus } from '../../hooks/useTraineeQuickView';
import './QuickViewHero.css';

interface QuickViewHeroProps {
  name: string;
  /** Her profile photo's signed link, or null = initials. */
  photoUrl: string | null;
  /** The id of the name, which labels the drawer. */
  nameId: string;
  status: QuickViewStatus;
  statusLabel: string;
  /** "Last activity: 2 hours ago", when she has any. */
  lastActivity: string | null;
}

/** The top of the quick view: her photo or initials, name and status, over a soft cloud in her status color. */
export function QuickViewHero({ name, photoUrl, nameId, status, statusLabel, lastActivity }: QuickViewHeroProps) {
  return (
    <header className="tqv-hero" data-status={status}>
      <span className="tqv-hero-avatar" aria-hidden="true">
        {initialsOf(name)}
        <AvatarImage url={photoUrl} />
      </span>
      <h2 className="tqv-hero-name" id={nameId}>
        <bdi>{name}</bdi>
      </h2>
      <p className="tqv-hero-sub">
        <span className="tqv-hero-pill">
          <span className="tqv-hero-dot" aria-hidden="true" />
          {statusLabel}
        </span>
        {lastActivity && <span>{lastActivity}</span>}
      </p>
    </header>
  );
}
