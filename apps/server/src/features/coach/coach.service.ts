import type { HydratedDocument, Types } from 'mongoose';
import type { CoachTraineeDetail, CoachTraineeSummary, PlanStatus, TraineeStatus } from '@sistem/types';
import { User } from '../users/user.model';
import type { UserDocument } from '../users/user.model';
import { toPublicAvatar } from '../users/avatar';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { toMyOnboarding } from '../onboarding/onboarding.service';
import { PLAN_WAIT_MS } from '../onboarding/onboarding.constants';
import { Plan } from '../plans/plan.model';
import { addDays, currentWeekStart } from '../plans/planWeek';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { Coaching } from '../coachings/coaching.model';
import { listCoachCoachings, planWindowStart } from '../coachings/coaching.service';
import type { LeanCoaching } from '../coachings/coaching.service';

// The human Coach's view of her trainees (PRD §6). The list comes from HER live coachings, and each
// trainee's plans / logs are read through that coaching only — never "all trainees", never another
// coach's records for the same trainee.

interface PlanWeek {
  weekStartDate: string;
  status: PlanStatus;
}

interface TraineeStatusInput {
  onboardingCompleted: boolean;
  /** Sunday of the current week in the trainee's time zone */
  currentWeek: string;
  plans: PlanWeek[];
}

/**
 * The trainee's place in the coach's list (PRD §6), and whether next week still has
 * no plan at all. Weeks are compared as 'YYYY-MM-DD' strings in the trainee's zone.
 */
export function resolveTraineeStatus({ onboardingCompleted, currentWeek, plans }: TraineeStatusInput): {
  status: TraineeStatus;
  needsNextWeekPlan: boolean;
} {
  if (!onboardingCompleted) return { status: 'new', needsNextWeekPlan: false };

  const published = plans.filter((plan) => plan.status === 'published');
  if (published.length === 0) return { status: 'waiting', needsNextWeekPlan: false };

  if (!published.some((plan) => plan.weekStartDate >= currentWeek)) {
    return { status: 'inactive', needsNextWeekPlan: false };
  }
  const nextWeek = addDays(currentWeek, 7);
  return { status: 'active', needsNextWeekPlan: !plans.some((plan) => plan.weekStartDate === nextWeek) };
}

interface TraineeWithCoaching {
  user: HydratedDocument<UserDocument>;
  coaching: LeanCoaching;
}

async function toTraineeSummaries(rows: TraineeWithCoaching[], now: Date): Promise<CoachTraineeSummary[]> {
  const coachingIds = rows.map((row) => row.coaching._id);
  const [plans, lastLogs] = await Promise.all([
    Plan.find({ coachingId: { $in: coachingIds } })
      .select('traineeId weekStartDate status')
      .lean<(PlanWeek & { traineeId: Types.ObjectId })[]>(),
    WorkoutLog.aggregate<{ _id: Types.ObjectId; lastActivityAt: Date }>([
      { $match: { coachingId: { $in: coachingIds } } },
      { $group: { _id: '$traineeId', lastActivityAt: { $max: '$startedAt' } } },
    ]),
  ]);

  const plansByTrainee = new Map<string, PlanWeek[]>();
  for (const plan of plans) {
    const key = String(plan.traineeId);
    plansByTrainee.set(key, [...(plansByTrainee.get(key) ?? []), plan]);
  }
  const lastActivity = new Map(lastLogs.map((entry) => [String(entry._id), entry.lastActivityAt]));

  return rows.map(({ user, coaching }) => {
    const id = String(user._id);
    const currentWeek = currentWeekStart(user.timezone, now);
    const { status, needsNextWeekPlan } = resolveTraineeStatus({
      onboardingCompleted: user.onboardingStatus === 'completed',
      currentWeek,
      plans: plansByTrainee.get(id) ?? [],
    });
    const completedAt = user.onboardingCompletedAt ?? null;
    const windowStart = planWindowStart(completedAt, coaching.startedAt);

    return {
      id,
      name: user.name,
      email: user.email,
      avatar: toPublicAvatar(user.avatar),
      onboardingStatus: user.onboardingStatus,
      onboardingCompletedAt: completedAt ? completedAt.toISOString() : null,
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
      status,
      planDueAt:
        status === 'waiting' && windowStart ? new Date(windowStart.getTime() + PLAN_WAIT_MS).toISOString() : null,
      needsNextWeekPlan,
      lastActivityAt: lastActivity.get(id)?.toISOString() ?? null,
      currentWeekStart: currentWeek,
      coachingId: String(coaching._id),
      coachingStatus: coaching.status,
      coachingStartedAt: coaching.startedAt.toISOString(),
    };
  });
}

/** Her trainees = her live coachings (waiting + active), newest first. */
export async function listCoachTrainees(coachId: string, now: Date = new Date()): Promise<CoachTraineeSummary[]> {
  const coachings = await listCoachCoachings(coachId);
  const users = await User.find({ _id: { $in: coachings.map((coaching) => coaching.traineeId) } });
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const rows = coachings.flatMap((coaching) => {
    const user = byId.get(String(coaching.traineeId));
    return user ? [{ user, coaching }] : [];
  });
  return toTraineeSummaries(rows, now);
}

/** Call only after loadCoachTrainee has checked the live coaching (it set coachingId). */
export async function getCoachTraineeDetail(traineeId: string, coachingId: string, now: Date = new Date()): Promise<CoachTraineeDetail> {
  const [trainee, coaching] = await Promise.all([User.findById(traineeId), Coaching.findById(coachingId).lean<LeanCoaching>()]);
  if (!trainee || !coaching) {
    throw new Error('Trainee disappeared after the ownership check.');
  }
  const [[summary], response] = await Promise.all([
    toTraineeSummaries([{ user: trainee, coaching }], now),
    OnboardingResponse.findOne({ userId: traineeId }).lean(),
  ]);
  return {
    ...summary,
    onboarding: response || trainee.onboardingStatus !== 'not_started' ? toMyOnboarding(trainee, response) : null,
  };
}
