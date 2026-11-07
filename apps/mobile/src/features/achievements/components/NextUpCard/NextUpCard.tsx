import type { CSSProperties } from 'react';
import { closestBadges, describeAchievement, describeAchievementProgress, useCopy, useLanguage } from '@sistem/shared';
import type { AchievementBoard } from '@sistem/shared';
import { achievementCopy } from '../../copy';
import './NextUpCard.css';

/** "הבא בתור": the closest badge of up to three categories, each bar in its category color. */
export function NextUpCard({ board }: { board: AchievementBoard }) {
  const language = useLanguage();
  const copy = useCopy(achievementCopy).board;
  const next = closestBadges(board);
  if (next.length === 0) return null;

  return (
    <section className="ach-page-card" aria-labelledby="ach-next-title">
      <h2 className="ach-page-card-title" id="ach-next-title">
        {copy.nextUp}
      </h2>
      <ul className="ach-next-list">
        {next.map((badge) => {
          const name = describeAchievement(badge.type, language).name;
          const progress = describeAchievementProgress(badge.progress, language);
          return (
            <li key={badge.type} className={`ach-next-row ach-category-${badge.category}`}>
              <span className="ach-next-dot" aria-hidden="true" />
              <span className="ach-next-body">
                <span className="ach-next-title">{name}</span>
                <span
                  className="ach-next-bar"
                  role="progressbar"
                  aria-label={name}
                  aria-valuetext={progress ?? undefined}
                  aria-valuemin={0}
                  aria-valuemax={badge.progress.threshold}
                  aria-valuenow={Math.min(badge.progress.current, badge.progress.threshold ?? 0)}
                >
                  {/* A computed value, not styling: how far she is. */}
                  <span className="ach-next-fill" style={{ '--progress': badge.fraction } as CSSProperties} />
                </span>
              </span>
              {progress && <span className="ach-next-count">{progress}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
