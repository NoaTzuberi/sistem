import type { Plan as PublicPlan, TraineePlan, TraineePlanList, TraineeWeek } from '@sistem/types';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { cardioLogRefs } from '../cardio/cardio.service';
import { Plan } from './plan.model';
import { PlanNotFoundError, attachExerciseFacts, toPublicPlan } from './plan.service';
import type { LeanPlan } from './plan.service';
import { pickNextWorkoutId, toTraineePlan } from './planStatus';
import type { WorkoutLogRef } from './planStatus';
import { addDays, localDateString, weekStartOf } from './planWeek';
import { coachingIdsOf, findOwnCoaching, getCurrentCoaching } from '../coachings/coaching.service';
import { getCoachName } from '../coachProfiles/coachProfile.service';

// The trainee's own side of plans (PRD §5.1, §5.4): published plans only, each
// workout with its status. Every query is scoped by the caller's id.

/** Today's calendar date where the trainee lives — never the server's or the device's. */
export async function todayFor(traineeId: string, now: Date): Promise<string> {
  const user = await User.findById(traineeId).select('timezone').lean();
  return localDateString(now, user?.timezone ?? DEFAULT_TIMEZONE);
}

async function toTraineePlans(traineeId: string, plans: LeanPlan[], today: string): Promise<TraineePlan[]> {
  const publicPlans: PublicPlan[] = plans.map(toPublicPlan);
  const [logs, cardioLogs] = await Promise.all([
    WorkoutLog.find({ traineeId, planId: { $in: plans.map((plan) => plan._id) } })
      .sort({ startedAt: -1 })
      .select('planId workoutId status')
      .lean(),
    // A cardio workout is done by its cardio log (its logId then points at that log).
    cardioLogRefs(traineeId, plans.map((plan) => plan._id)),
    attachExerciseFacts(publicPlans),
  ]);

  const logRefs: WorkoutLogRef[] = [
    ...logs.map((log) => ({
      id: String(log._id),
      planId: String(log.planId),
      workoutId: String(log.workoutId),
      status: log.status,
    })),
    ...cardioLogs,
  ];
  return publicPlans.map((plan) => toTraineePlan(plan, logRefs, today));
}

/**
 * Her published plans. With a coachingId: that coaching only. Without: every plan of a live
 * coaching, plus past weeks of ended ones (her history stays; an ended coach's future weeks don't show).
 */
export async function listTraineePlans(traineeId: string, now: Date = new Date(), coachingId: string | null = null): Promise<TraineePlanList> {
  const [today, liveIds] = await Promise.all([todayFor(traineeId, now), coachingIdsOf(traineeId)]);
  const scope = coachingId
    ? { coachingId }
    : { $or: [{ coachingId: { $in: liveIds } }, { weekStartDate: { $lt: weekStartOf(today) } }] };
  const plans = await Plan.find({ traineeId, status: 'published', ...scope }).sort({ weekStartDate: -1 }).lean<LeanPlan[]>();
  return {
    items: await toTraineePlans(traineeId, plans, today),
    today,
    nextWeekStartDate: addDays(weekStartOf(today), 7),
    serverTime: now.toISOString(),
  };
}

/** Someone else's plan or a draft looks the same: not found. */
export async function getTraineePlan(planId: string, traineeId: string, now: Date = new Date()): Promise<TraineePlan> {
  const [today, plan] = await Promise.all([
    todayFor(traineeId, now),
    Plan.findOne({ _id: planId, traineeId, status: 'published' }).lean<LeanPlan>(),
  ]);
  if (!plan) {
    throw new PlanNotFoundError('plan_not_found');
  }
  const [traineePlan] = await toTraineePlans(traineeId, [plan], today);
  return traineePlan;
}

/** This week's published plan (if any) and the workout to start next. */
/**
 * This week's published plan (if any) and the workout to start next — for one coaching: the one
 * asked for, else her current coaching (the single-coach app).
 */
export async function getTraineeWeek(traineeId: string, now: Date = new Date(), coachingId: string | null = null): Promise<TraineeWeek> {
  const [user, coaching] = await Promise.all([
    User.findById(traineeId).select('timezone').lean(),
    coachingId ? findOwnCoaching(traineeId, coachingId) : getCurrentCoaching(traineeId),
  ]);
  const today = localDateString(now, user?.timezone ?? DEFAULT_TIMEZONE);
  const weekStartDate = weekStartOf(today);
  const [plan, active, coachName] = await Promise.all([
    coaching ? Plan.findOne({ traineeId, coachingId: coaching._id, weekStartDate, status: 'published' }).lean<LeanPlan>() : null,
    WorkoutLog.findOne({ traineeId, status: 'in_progress' }).select('source planId workoutId workoutTitle startedAt').lean(),
    // Her coach's name only (Home's coach card: name + initials) — nothing else about the coach.
    coaching ? getCoachName(coaching.coachId) : null,
  ]);
  const [traineePlan = null] = plan ? await toTraineePlans(traineeId, [plan], today) : [];

  return {
    weekStartDate,
    today,
    serverTime: now.toISOString(),
    plan: traineePlan,
    nextWorkoutId: traineePlan ? pickNextWorkoutId(traineePlan) : null,
    coach: coachName ? { name: coachName } : null,
    activeLog: active
      ? {
          logId: String(active._id),
          source: active.source ?? 'plan',
          planId: active.planId ? String(active.planId) : null,
          workoutId: active.workoutId ? String(active.workoutId) : null,
          workoutTitle: active.workoutTitle,
          startedAt: active.startedAt.toISOString(),
        }
      : null,
  };
}
