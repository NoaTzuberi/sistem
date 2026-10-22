import type { AchievementOverview } from '@sistem/types';
import { IconCamera, IconPencil, IconSettings } from '@tabler/icons-react';
import { fill, useCopy } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { AvatarPhoto } from '../../../../components/common/AvatarPhoto/AvatarPhoto';
import { monthCode } from '../../data/profileDisplay';
import { profileCopy } from '../../copy';
import './ProfileHero.css';

interface ProfileHeroProps {
  name: string;
  initials: string;
  joinDate: string | null;
  coach: { name: string; initials: string } | null;
  /** Her communities (names only); the block is not drawn while there are none. */
  communities: { id: string; name: string }[];
  overview: AchievementOverview | null;
  avatarUrl: string | null;
  isUploading: boolean;
  onAvatarExpired: () => void;
  /** The avatar, its camera badge and "עריכת פרופיל" open the photo sheet. */
  onOpenPhoto: () => void;
  onOpenSettings: () => void;
  onOpenCoach: () => void;
}

/**
 * The top of Profile (docs/design/trainee-profile.html): a pink stage with a fine grain and only the
 * settings gear on it ("פרופיל" is a hidden h1), then the white profile card — the avatar over its top
 * edge, her name, her coach + since when, her communities (chips — no community page yet, so they are
 * labels, not buttons), "עריכת פרופיל" and the scoreboard.
 */
export function ProfileHero({
  name,
  initials,
  joinDate,
  coach,
  communities,
  overview,
  avatarUrl,
  isUploading,
  onAvatarExpired,
  onOpenPhoto,
  onOpenSettings,
  onOpenCoach,
}: ProfileHeroProps) {
  const copy = useCopy(profileCopy);

  return (
    <header className="pf-hero">
      <div className="pf-stage" aria-hidden="true" />
      <div className="pf-hero-top">
        <h1 className="pf-sr-only">{copy.title}</h1>
        <button type="button" className="pf-hero-settings" aria-label={copy.settings} onClick={onOpenSettings}>
          <IconSettings size={22} aria-hidden="true" />
        </button>
      </div>

      <section className="pf-card" aria-label={copy.profileCard}>
        <button
          type="button"
          className="pf-avatar"
          aria-label={isUploading ? copy.avatarUploading : avatarUrl ? copy.avatarChange : copy.avatarAdd}
          aria-busy={isUploading}
          onClick={onOpenPhoto}
        >
          <span className="pf-avatar-face">
            <span aria-hidden="true">{initials}</span>
            <AvatarPhoto url={avatarUrl} onExpired={onAvatarExpired} />
            {isUploading && (
              <span className="pf-avatar-busy" aria-hidden="true">
                <Spinner size="sm" />
              </span>
            )}
          </span>
          <span className="pf-avatar-camera" aria-hidden="true">
            <IconCamera size={15} stroke={2.4} />
          </span>
        </button>

        <p className="pf-name" dir="auto">
          {name}
        </p>

        {(coach || joinDate) && (
          <p className="pf-meta">
            {coach && (
              <span>
                {copy.trainsWith}{' '}
                <button type="button" className="pf-meta-link" onClick={onOpenCoach}>
                  <bdi>{coach.name}</bdi>
                </button>
              </span>
            )}
            {coach && joinDate && <span className="pf-meta-dot" aria-hidden="true" />}
            {joinDate && <Eyebrow keepInEnglish>{fill(copy.eyebrow.since, { month: monthCode(joinDate) })}</Eyebrow>}
          </p>
        )}

        {communities.length > 0 && (
          <div className="pf-comms">
            <p className="pf-comms-title" id="pf-comms-title">
              {copy.communities}
            </p>
            <ul className="pf-comms-list" aria-labelledby="pf-comms-title">
              {communities.map((community) => (
                <li key={community.id} className="pf-comm">
                  <span className="pf-comm-mark" aria-hidden="true" />
                  <bdi>{community.name}</bdi>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" className="pf-edit" onClick={onOpenPhoto}>
          <IconPencil size={16} stroke={2.2} aria-hidden="true" />
          {copy.editProfile}
        </button>

        {overview && (
          <dl className="pf-score" aria-label={copy.scoreLabel}>
            <div className="pf-score-cell">
              <dt className="pf-score-label">{copy.scoreWorkouts}</dt>
              <dd className="pf-score-value">{overview.stats.completedWorkouts}</dd>
            </div>
            <div className="pf-score-cell">
              <dt className="pf-score-label">{copy.scoreStreak}</dt>
              <dd className="pf-score-value">{overview.streak.current}</dd>
            </div>
            <div className="pf-score-cell">
              <dt className="pf-score-label">{copy.scorePrs}</dt>
              <dd className="pf-score-value">{overview.stats.personalRecords}</dd>
            </div>
          </dl>
        )}
      </section>
    </header>
  );
}
