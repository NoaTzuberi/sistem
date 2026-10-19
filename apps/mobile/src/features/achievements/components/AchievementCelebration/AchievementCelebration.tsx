import { describeAchievement, useCopy, useI18n, useLanguage } from '@sistem/shared';
import { Modal } from '../../../../components/common/Modal/Modal';
import { Button } from '../../../../components/common/Button/Button';
import { useAuth } from '../../../../services/auth/AuthContext';
import { finishCelebration, useCelebrationQueue } from '../../celebration';
import { usePopReveal } from '../../hooks/usePopReveal';
import { AchievementBadge } from '../AchievementBadge/AchievementBadge';
import { achievementCopy } from '../../copy';
import './AchievementCelebration.css';

/**
 * The celebration moment (Phase 11), mounted once for the whole app: a sheet with the
 * achievements just unlocked (a body save, or anything Home found not celebrated yet).
 * Closing it marks them seen, so each one is celebrated once.
 */
export function AchievementCelebration() {
  const language = useLanguage();
  const { plural } = useI18n();
  const copy = useCopy(achievementCopy);
  const { user } = useAuth();
  const queue = useCelebrationQueue();
  const isOpen = user?.role === 'trainee' && queue.length > 0;
  const listRef = usePopReveal<HTMLUListElement>(isOpen ? queue.map((achievement) => achievement.id).join(',') : '');

  return (
    <Modal isOpen={isOpen} onClose={finishCelebration} title={plural(copy.celebrationTitle, queue.length)} className="achievement-celebration">
      <ul className="achievement-celebration-list" ref={listRef}>
        {queue.map((achievement) => {
          const text = describeAchievement(achievement.type, language);
          return (
            <li key={achievement.id} className="achievement-celebration-item" data-reveal>
              <AchievementBadge type={achievement.type} size="lg" />
              <span className="achievement-celebration-name display-title">{text.name}</span>
              <span className="achievement-celebration-description">{text.description}</span>
            </li>
          );
        })}
      </ul>
      <Button className="achievement-celebration-done" onClick={finishCelebration}>
        {copy.celebrationDone}
      </Button>
    </Modal>
  );
}
