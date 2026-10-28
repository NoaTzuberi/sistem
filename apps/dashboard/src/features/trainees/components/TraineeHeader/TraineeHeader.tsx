import type { CoachTraineeDetail } from '@sistem/types';
import { fill, formatTimeLeft, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { ActionMenu } from '../../../../components/common/ActionMenu/ActionMenu';
import { Tag } from '../../../../components/common/Tag/Tag';
import { useCoachData } from '../../../../services/coach/CoachDataContext';
import { traineesCopy } from '../../copy';
import { statusTagTone } from '../../data/traineeFacts';
import { planWindowFraction, traineeHeaderChips } from '../../data/traineeHeader';
import { PlanWindowPill } from '../PlanWindowPill/PlanWindowPill';
import { AvatarImage } from '../../../../components/common/AvatarImage/AvatarImage';
import './TraineeHeader.css';

interface TraineeHeaderProps {
  trainee: CoachTraineeDetail;
  /** "Now" on the server's clock — the 48h window counts against it. */
  nowMs: number;
  /** The pink pill: build her plan (waiting) / plan next week (active). */
  onBuildPlan: () => void;
  /** The ⋯ menu's "End coaching" (Cherry text) — opens the confirm dialog. */
  onEndCoaching: () => void;
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('');
}

/**
 * The profile's header card: who she is (name, status, the chips of her own onboarding answers,
 * email and time zone), and on the side what the coach owes her now — the 48h window while she
 * waits for her first plan, this week's workouts once she is active — with the one action.
 */
export function TraineeHeader({ trainee, nowMs, onBuildPlan, onEndCoaching }: TraineeHeaderProps) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(traineesCopy);
  const { weekOf } = useCoachData();
  const chips = traineeHeaderChips(trainee, language);
  const currentPlan = weekOf(trainee.id)?.currentPlan ?? null;
  const planWindow = trainee.planDueAt ? formatTimeLeft(trainee.planDueAt, nowMs, language) : null;
  const isActive = trainee.status === 'active';

  return (
    <header className="trainee-header">
      {/* Her profile photo, else her initials. Decorative — the name is right next to it. */}
      <span className="trainee-avatar" aria-hidden="true">
        {initialsOf(trainee.name)}
        <AvatarImage url={trainee.avatar?.url} />
      </span>

      <div className="trainee-identity">
        <h1 className="trainee-name">
          <bdi>{trainee.name}</bdi>
          <Tag tone={statusTagTone(trainee, nowMs)}>{shared.traineeStatus.labels[trainee.status]}</Tag>
          {trainee.needsNextWeekPlan && <Tag tone="accent">{shared.traineeStatus.needsNextWeek}</Tag>}
        </h1>
        {(chips.facts.length > 0 || chips.flags.length > 0) && (
          <ul className="trainee-chips">
            {chips.facts.map((chip) => (
              <li key={chip} className="trainee-chip">
                {chip}
              </li>
            ))}
            {chips.flags.map((flag) => (
              <li key={flag} className="trainee-chip trainee-chip-flag">
                <span aria-hidden="true">⚠</span> {flag}
              </li>
            ))}
          </ul>
        )}
        <p className="trainee-meta">
          <span dir="ltr">{trainee.email}</span>
          <span dir="ltr">{trainee.timezone}</span>
        </p>
      </div>

      <div className="trainee-side">
        {planWindow && trainee.planDueAt ? (
          <PlanWindowPill
            value={planWindow.text}
            caption={planWindow.isOverdue ? copy.windowPassed : copy.windowRunning}
            fraction={planWindowFraction(trainee.planDueAt, nowMs)}
            isLate={planWindow.isOverdue}
          />
        ) : (
          currentPlan && (
            <PlanWindowPill
              value={fill(copy.weekProgress, { done: currentPlan.completed, planned: currentPlan.planned })}
              caption={copy.workoutsThisWeek}
              fraction={currentPlan.planned > 0 ? currentPlan.completed / currentPlan.planned : 0}
            />
          )
        )}
        <div className="trainee-side-actions">
          <PillButton variant="primary" onClick={onBuildPlan}>
            {isActive ? copy.nextWeek : copy.buildPlanShort}
          </PillButton>
          <ActionMenu
            label={shared.coach.endCoaching.moreActions}
            items={[{ id: 'end-coaching', label: shared.coach.endCoaching.action, danger: true, onSelect: onEndCoaching }]}
          />
        </div>
      </div>
    </header>
  );
}
