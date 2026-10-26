import type { HydratedDocument, Types } from 'mongoose';
import type { CoachTraineeDetail, CoachTraineeSummary, PlanStatus, TraineeStatus } from '@sistem/types';
import { User } from '../users/user.model';
import type { UserDocument } from '../users/user.model';
import { toPublicAvatar } from '../users/avatar';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { toMyOnboarding } from '../onboarding/onboarding.service';
import { PLAN_WAIT_MS } from '../onboarding/onboarding.constants';
import { Plan } from '../plans/plan.model';
import { addDays, currentWeekStart, localDateString } from '../plans/planWeek';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { CardioLog } from '../cardio/cardio.model';
import { buildThisWeek, coachingWeekNumber, resolveAttention } from './coachAttention';
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

interface PlanRow extends PlanWeek {
  _id: Types.ObjectId;
  traineeId: Types.ObjectId;
  splitId?: string;
  workouts: { _id: Types.ObjectId; title: string; kind?: 'strength' | 'cardio'; dayOfWeek?: number }[];
}

/** Her newest completed workout this coach can see: plan logs of the coaching + her free logs, strength and cardio. */
async function lastCompletedByTrainee(coachingIds: Types.ObjectId[], traineeIds: Types.ObjectId[]): Promise<Map<string, Date>> {
  const [strength, cardio] = await Promise.all([
    WorkoutLog.aggregate<{ _id: Types.ObjectId; at: Date }>([
      { $match: { status: 'completed', $or: [{ coachingId: { $in: coachingIds } }, { traineeId: { $in: traineeIds }, source: 'free' }] } },
      { $group: { _id: '$traineeId', at: { $max: { $ifNull: ['$finishedAt', '$startedAt'] } } } },
    ]),
    CardioLog.aggregate<{ _id: Types.ObjectId; at: Date }>([
      { $match: { $or: [{ coachingId: { $in: coachingIds } }, { traineeId: { $in: traineeIds }, ownWorkoutId: { $type: 'objectId' } }] } },
      { $group: { _id: '$traineeId', at: { $max: '$createdAt' } } },
    ]),
  ]);
  const latest = new Map<string, Date>();
  for (const row of [...strength, ...cardio]) {
    const key = String(row._id);
    const known = latest.get(key);
    if (!known || row.at > known) latest.set(key, row.at);
  }
  return latest;
}

/** The '<planId>:<workoutId>' keys done in these plans (a completed strength log or a cardio log). */
async function doneWorkoutKeys(planIds: Types.ObjectId[]): Promise<Set<string>> {
  if (planIds.length === 0) return new Set();
  type Row = { planId: Types.ObjectId; workoutId: Types.ObjectId };
  const [strength, cardio] = await Promise.all([
    WorkoutLog.find({ planId: { $in: planIds }, status: 'completed' }).select('planId workoutId').lean<Row[]>(),
    CardioLog.find({ planId: { $in: planIds } }).select('planId workoutId').lean<Row[]>(),
  ]);
  return new Set([...strength, ...cardio].map((row) => `${row.planId}:${row.workoutId}`));
}

async function toTraineeSummaries(rows: TraineeWithCoaching[], now: Date): Promise<CoachTraineeSummary[]> {
  const coachingIds = rows.map((row) => row.coaching._id);
  const traineeIds = rows.map((row) => row.user._id);
  const [plans, lastLogs, lastCompleted] = await Promise.all([
    Plan.find({ coachingId: { $in: coachingIds } })
      .select('traineeId weekStartDate status splitId workouts._id workouts.title workouts.kind workouts.dayOfWeek')
      .lean<PlanRow[]>(),
    WorkoutLog.aggregate<{ _id: Types.ObjectId; lastActivityAt: Date }>([
      { $match: { coachingId: { $in: coachingIds } } },
      { $group: { _id: '$traineeId', lastActivityAt: { $max: '$startedAt' } } },
    ]),
    lastCompletedByTrainee(coachingIds, traineeIds),
  ]);

  const plansByTrainee = new Map<string, PlanRow[]>();
  for (const plan of plans) {
    const key = String(plan.traineeId);
    plansByTrainee.set(key, [...(plansByTrainee.get(key) ?? []), plan]);
  }
  const lastActivity = new Map(lastLogs.map((entry) => [String(entry._id), entry.lastActivityAt]));

  const currentPlans = new Map<string, PlanRow>();
  for (const { user } of rows) {
    const week = currentWeekStart(user.timezone, now);
    const current = (plansByTrainee.get(String(user._id)) ?? []).find((plan) => plan.status === 'published' && plan.weekStartDate === week);
    if (current) currentPlans.set(String(user._id), current);
  }
  const done = await doneWorkoutKeys([...currentPlans.values()].map((plan) => plan._id));

  return rows.map(({ user, coaching }) => {
    const id = String(user._id);
    const currentWeek = currentWeekStart(user.timezone, now);
    const today = localDateString(now, user.timezone);
    const herPlans = plansByTrainee.get(id) ?? [];
    const { status, needsNextWeekPlan } = resolveTraineeStatus({
      onboardingCompleted: user.onboardingStatus === 'completed',
      currentWeek,
      plans: herPlans,
    });
    const completedAt = user.onboardingCompletedAt ?? null;
    const windowStart = planWindowStart(completedAt, coaching.startedAt);

    const current = currentPlans.get(id);
    const thisWeek = current
      ? buildThisWeek(
          {
            id: String(current._id),
            weekStartDate: current.weekStartDate,
            splitId: current.splitId ?? null,
            workouts: current.workouts.map((workout) => ({ ...workout, id: String(workout._id) })),
          },
          today,
          (workoutId) => done.has(`${current._id}:${workoutId}`),
        )
      : null;
    const publishedWeeks = herPlans.filter((plan) => plan.status === 'published').map((plan) => plan.weekStartDate);
    const firstPlanWeek = publishedWeeks.length > 0 ? publishedWeeks.reduce((first, week) => (week < first ? week : first)) : null;
    const lastCompletedAt = lastCompleted.get(id) ?? null;

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
      thisWeek,
      coachingWeek: coachingWeekNumber(firstPlanWeek, currentWeek),
      lastCompletedAt: lastCompletedAt?.toISOString() ?? null,
      attention: resolveAttention({
        coachingStatus: coaching.status,
        today,
        lastCompletedDate: lastCompletedAt ? localDateString(lastCompletedAt, user.timezone) : null,
        firstPlanWeek,
        missedThisWeek: thisWeek?.missed ?? 0,
      }),
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
