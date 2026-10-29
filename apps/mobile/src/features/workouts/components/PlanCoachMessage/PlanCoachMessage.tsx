import { useCallback, useState } from 'react';
import type { TraineePlan } from '@sistem/types';
import { CoachCard } from '../../../nutrition/components/CoachCard/CoachCard';
import { CoachTip } from '../../../nutrition/components/CoachTip/CoachTip';
import { isPlanIntroSeen, markPlanIntroSeen, planIntroKey } from '../../data/planIntroSeen';
import './PlanCoachMessage.css';

interface PlanCoachMessageProps {
  plan: TraineePlan;
  coachName: string | null;
}

/** The message + tip her coach sent with this week's plan — the same cards as the nutrition note. */
export function PlanCoachMessage({ plan, coachName }: PlanCoachMessageProps) {
  const key = planIntroKey(plan.id, plan.publishedAt);
  // Read once per message: open until then (kept for this visit so it doesn't snap shut).
  const [unread] = useState(() => !isPlanIntroSeen(key));
  const markRead = useCallback(() => markPlanIntroSeen(key), [key]);

  if (!plan.introMessage && !plan.introTip) return null;
  return (
    <div className="plan-coach-message">
      {plan.introMessage && <CoachCard key={key} text={plan.introMessage} coachName={coachName} unread={unread} onRead={markRead} />}
      {plan.introTip && <CoachTip key={`tip-${key}`} text={plan.introTip} coachName={coachName} onSeen={plan.introMessage ? undefined : markRead} />}
    </div>
  );
}
