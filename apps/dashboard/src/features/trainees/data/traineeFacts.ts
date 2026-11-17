import type { CoachTraineeSummary, CoachTraineeWeek } from '@sistem/types';
import { isPlanWindowUrgent, isolateLtr } from '@sistem/shared';
import type { TagTone } from '../../../components/common/Tag/Tag';

// The 48h rule is shared with coach mode's "דורש טיפול" (@sistem/shared coachTodo). `nowMs` = the server's clock.
export { isPlanWindowUrgent };

/** '3' or '3–4' training days. */
export function describeDaysPerWeek(days: NonNullable<CoachTraineeWeek['daysPerWeek']>): string {
  return days.min === days.max ? String(days.min) : isolateLtr(`${days.min}–${days.max}`);
}


/** How loud a trainee's status tag is: solid pink only when the 48h window is running out. */
export function statusTagTone(trainee: CoachTraineeSummary, nowMs: number): TagTone {
  if (trainee.status === 'waiting') return trainee.planDueAt && isPlanWindowUrgent(trainee.planDueAt, nowMs) ? 'solid' : 'accent';
  return trainee.status === 'active' ? 'quiet' : 'neutral';
}
