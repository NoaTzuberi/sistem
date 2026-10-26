import type { CoachTodayResponse, CoachTraineeSummary } from '@sistem/types';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { localDateString } from '../plans/planWeek';
import { listCoachTrainees } from './coach.service';
import { weekOfYear } from './coachAttention';

// GET /coach/today: the coach mode Today stage (scoreboard, waiting carousel, attention cards). Built
// from the same trainee summaries as the list, so a number on Today always matches its filter there.

/** At least one completed workout (plan, free or cardio) in her current week, in her zone. */
function trainedThisWeek(trainee: CoachTraineeSummary): boolean {
  if ((trainee.thisWeek?.completed ?? 0) > 0) return true;
  return trainee.lastCompletedAt !== null && localDateString(new Date(trainee.lastCompletedAt), trainee.timezone) >= trainee.currentWeekStart;
}

function attentionWeight(trainee: CoachTraineeSummary): number {
  const attention = trainee.attention;
  if (!attention) return 0;
  // Days without a workout first (longest first), then missed workouts.
  return attention.reason === 'no_workout' ? 1000 + attention.days : attention.count;
}

export async function getCoachToday(coachId: string, now: Date = new Date()): Promise<CoachTodayResponse> {
  const [coach, trainees] = await Promise.all([
    User.findById(coachId).select('timezone').lean<{ timezone?: string }>(),
    listCoachTrainees(coachId, now),
  ]);
  const today = localDateString(now, coach?.timezone ?? DEFAULT_TIMEZONE);
  const active = trainees.filter((trainee) => trainee.coachingStatus === 'active');
  const waiting = trainees
    .filter((trainee) => trainee.coachingStatus === 'waiting')
    .sort((a, b) => a.coachingStartedAt.localeCompare(b.coachingStartedAt));
  const attention = trainees.filter((trainee) => trainee.attention).sort((a, b) => attentionWeight(b) - attentionWeight(a));

  return {
    serverTime: now.toISOString(),
    today,
    weekOfYear: weekOfYear(today),
    scoreboard: {
      trainedThisWeek: active.filter(trainedThisWeek).length,
      activeTrainees: active.length,
      waiting: waiting.length,
      attention: attention.length,
    },
    waiting,
    attention,
  };
}
