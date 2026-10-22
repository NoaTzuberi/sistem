import { useEffect, useRef } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { achievementBadgeNumber, describeAchievement, describeAchievementProgress, fill, formatUnlockedDate, isolateLtr, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { useDrawerTransition } from '../../../../hooks/useDrawerTransition';
import { achievementCategoryClass } from '../../data/achievementCategories';
import type { BadgeEntry } from '@sistem/shared';
import { Confetti } from '../Confetti/Confetti';
import { Medal } from '../Medal/Medal';
import { traineesCopy } from '../../copy';
import './AchievementModal.css';

interface AchievementModalProps {
  /** The badge shown — kept while the modal fades out. */
  badge: BadgeEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

// = --transition-drawer-out: the modal leaves the page once its fade is over.
const CLOSE_MS = 200;

/**
 * One achievement up close: the medal turns to face her, its category, name and rule, and either
 * the unlock date (with one confetti burst) or the progress bar. Esc, the scrim or ✕ close it; Tab
 * stays inside; the focus goes back to the badge that opened it.
 */
export function AchievementModal({ badge, isOpen, onClose }: AchievementModalProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy).achievementsTab;
  const { isMounted, isShown } = useDrawerTransition(isOpen, CLOSE_MS);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && isMounted) closeRef.current?.focus({ preventScroll: true });
  }, [isOpen, isMounted]);

  // Only the close button can take the focus: Tab stays on it.
  function keepFocusInside(event: ReactKeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      closeRef.current?.focus();
    }
  }

  if (!isMounted || !badge) return null;
  const text = describeAchievement(badge.type, language);
  const { progress } = badge;
  const progressText = describeAchievementProgress(progress, language) ?? copy.notStarted;

  return createPortal(
    <div className={isShown ? 'ach-modal ach-modal-shown' : 'ach-modal'} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={`ach-modal-card ${achievementCategoryClass(badge.category)}${badge.unlocked ? ' ach-modal-unlocked' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ach-modal-title"
        aria-describedby="ach-modal-rule"
        onKeyDown={keepFocusInside}
      >
        <button ref={closeRef} type="button" className="ach-modal-close" aria-label={shared.common.close} onClick={onClose}>
          <Icon name="close" size="sm" />
        </button>
        <div className="ach-modal-stage">
          <span className="ach-modal-medal">
            <Medal category={badge.category} unlocked={badge.unlocked} fraction={badge.fraction} number={achievementBadgeNumber(badge.type)} size="large" />
          </span>
          {badge.unlocked && isShown && <Confetti />}
        </div>
        <span className="ach-modal-category">{copy.categories[badge.category]}</span>
        <h2 className="ach-modal-title" id="ach-modal-title">
          {text.name}
        </h2>
        <p className="ach-modal-rule" id="ach-modal-rule">
          {text.description}
        </p>
        {badge.unlocked && progress.unlockedAt ? (
          <p className="ach-modal-done">
            <Icon name="check" size="sm" />
            {fill(copy.unlockedOn, { date: formatUnlockedDate(progress.unlockedAt, language) })}
            {progress.repeatable && progress.count > 1 && ` · ${isolateLtr(`×${progress.count}`)}`}
          </p>
        ) : (
          <div className="ach-modal-progress">
            <span className="ach-modal-bar" aria-hidden="true">
              {/* A computed value, not styling: how far she is. */}
              <span className="ach-modal-bar-fill" style={{ '--progress': badge.fraction } as CSSProperties} />
            </span>
            <span className="ach-modal-progress-text">{progressText}</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
