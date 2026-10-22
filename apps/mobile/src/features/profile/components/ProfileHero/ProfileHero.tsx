import type { AchievementOverview } from '@sistem/types';
import { IconSettings } from '@tabler/icons-react';
import { fill, isolateAuto, useCopy } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { monthCode, padWeek } from '../../data/profileDisplay';
import { profileCopy } from '../../copy';
import './ProfileHero.css';

interface ProfileHeroProps {
  name: string;
  initials: string;
  joinDate: string | null;
  /** Her week of membership today. */
  week: number | null;
  coach: { name: string; initials: string } | null;
  overview: AchievementOverview | null;
  onOpenSettings: () => void;
  onOpenCoach: () => void;
}

/**
 * The top of Profile: the title row, who she is and her three numbers. The first child is an empty
 * background layer — a decorative background goes there later without touching the rest of the screen.
 */
export function ProfileHero({ name, initials, joinDate, week, coach, overview, onOpenSettings, onOpenCoach }: ProfileHeroProps) {
  const copy = useCopy(profileCopy);

  return (
    <header className="pf-hero">
      <div className="pf-hero-bg" aria-hidden="true" />
      <div className="pf-hero-content">
        <div className="pf-hero-top">
          <h1 className="pf-hero-title">{copy.title}</h1>
          <button type="button" className="pf-hero-settings" aria-label={copy.settings} onClick={onOpenSettings}>
            <IconSettings size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="pf-me">
          {/* No profile photo field exists yet: initials only (see the report). */}
          <span className="pf-avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="pf-me-text">
            <p className="pf-me-name" dir="auto">
              {name}
            </p>
            {joinDate && week !== null && (
              <Eyebrow keepInEnglish>{fill(copy.eyebrow.memberSince, { month: monthCode(joinDate), week: padWeek(week) })}</Eyebrow>
            )}
            {coach && (
              <button type="button" className="pf-coach-chip" onClick={onOpenCoach}>
                <span className="pf-coach-chip-avatar" aria-hidden="true">
                  {coach.initials}
                </span>
                {fill(copy.coachChip, { name: isolateAuto(coach.name) })}
              </button>
            )}
          </div>
        </div>

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
      </div>
    </header>
  );
}
