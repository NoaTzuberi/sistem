import type { Types } from 'mongoose';
import type { CardioLog as PublicCardioLog, CoachCardioLogList, PlanCardio, SaveCardioLogPayload, TraineeCardioWorkoutResponse } from '@sistem/types';
import { LocalizedError } from '../../i18n';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { Plan } from '../plans/plan.model';
import { toPublicPlan } from '../plans/plan.service';
import type { LeanPlan } from '../plans/plan.service';
import { resolveWorkoutStatus } from '../plans/planStatus';
import type { WorkoutLogRef } from '../plans/planStatus';
import { addDays, localDateString, weekStartOf } from '../plans/planWeek';
import type { PlanWorkoutFields } from '../plans/plan.types';
import { COACH_CARDIO_LOG_LIMIT } from './cardio.constants';
import { CardioLog } from './cardio.model';
import type { CardioLogDocument } from './cardio.types';
import { cardioTotals } from './cardioSteps';

// Cardio workouts are plan workouts (kind 'cardio'): their day, note and status work like a strength
// workout's. This service adds what is cardio-only: one workout's page for her, and the log she saves.

export class CardioRequestError extends LocalizedError {}
export class CardioNotFoundError extends LocalizedError {}
export class CardioConflictError extends LocalizedError {}

type LeanLog = CardioLogDocument & { _id: Types.ObjectId };
type CardioWorkout = PlanWorkoutFields & { _id: Types.ObjectId; kind: 'cardio'; cardio: NonNullable<PlanWorkoutFields['cardio']> };

function toPublicLog(log: LeanLog): PublicCardioLog {
  return {
    id: String(log._id),
    planId: String(log.planId),
    workoutId: String(log.workoutId),
    workoutTitle: log.workoutTitle,
    sport: log.sport,
    date: log.date,
    completedSec: log.completedSec,
    roundsDone: log.roundsDone,
    roundsTotal: log.roundsTotal,
    highIntensitySec: log.highIntensitySec,
    distanceKm: log.distanceKm ?? null,
    rpe: log.rpe,
    note: log.note ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

async function traineeToday(traineeId: string, now: Date): Promise<string> {
  const user = await User.findById(traineeId).select('timezone').lean();
  return localDateString(now, user?.timezone ?? DEFAULT_TIMEZONE);
}

/** Her published plan's cardio workout; someone else's, a draft or a strength workout look the same: not found. */
async function findCardioWorkout(traineeId: string, planId: string, workoutId: string): Promise<{ plan: LeanPlan; workout: CardioWorkout }> {
  const plan = await Plan.findOne({ _id: planId, traineeId, status: 'published' }).lean<LeanPlan>();
  const workout = plan?.workouts.find((item) => String(item._id) === workoutId);
  if (!plan || !workout || workout.kind !== 'cardio' || !workout.cardio) throw new CardioNotFoundError('cardio_workout_not_found');
  return { plan, workout: workout as CardioWorkout };
}

const dayOf = (plan: LeanPlan, workout: CardioWorkout) => (workout.dayOfWeek === undefined || workout.dayOfWeek === null ? null : addDays(plan.weekStartDate, workout.dayOfWeek));

/** Her cardio logs as workout log refs, so plan statuses count them like completed strength logs. */
export async function cardioLogRefs(traineeId: string, planIds: Types.ObjectId[]): Promise<WorkoutLogRef[]> {
  if (planIds.length === 0) return [];
  const logs = await CardioLog.find({ traineeId, planId: { $in: planIds } }).select('planId workoutId').lean();
  return logs.map((log) => ({ id: String(log._id), planId: String(log.planId), workoutId: String(log.workoutId), status: 'completed' as const }));
}

export async function getTraineeCardioWorkout(traineeId: string, planId: string, workoutId: string, now: Date = new Date()): Promise<TraineeCardioWorkoutResponse> {
  const [today, { plan, workout }, trainee] = await Promise.all([
    traineeToday(traineeId, now),
    findCardioWorkout(traineeId, planId, workoutId),
    User.findById(traineeId).select('coachId').lean(),
  ]);
  const [log, coach] = await Promise.all([
    CardioLog.findOne({ traineeId, planId, workoutId }).lean<LeanLog>(),
    trainee?.coachId ? User.findById(trainee.coachId).select('name').lean() : null,
  ]);
  const date = dayOf(plan, workout);
  const publicWorkout = toPublicPlan(plan).workouts.find((item) => item.id === workoutId);
  return {
    planId,
    weekStartDate: plan.weekStartDate,
    workout: publicWorkout as TraineeCardioWorkoutResponse['workout'],
    date,
    status: resolveWorkoutStatus(date, plan.weekStartDate, today, log !== null),
    log: log ? toPublicLog(log) : null,
    coach: coach ? { name: coach.name } : null,
    canStart: !log && weekStartOf(today) === plan.weekStartDate,
  };
}

/**
 * Saves what she did, once per cardio workout, for a workout of this week (like a strength workout,
 * a missed one can still be done until the week ends). The workout's own numbers bound hers.
 */
export async function saveTraineeCardioLog(traineeId: string, input: SaveCardioLogPayload, now: Date = new Date()): Promise<PublicCardioLog> {
  const [today, { plan, workout }] = await Promise.all([traineeToday(traineeId, now), findCardioWorkout(traineeId, input.planId, input.workoutId)]);
  if (plan.weekStartDate !== weekStartOf(today)) throw new CardioRequestError('cardio_log_week');

  const totals = cardioTotals((workout.cardio as PlanCardio).steps);
  if (input.roundsDone > totals.rounds || input.completedSec > totals.totalSec || input.highIntensitySec > Math.min(totals.highIntensitySec, input.completedSec)) {
    throw new CardioRequestError('cardio_log_invalid');
  }
  try {
    const created = await CardioLog.create({
      traineeId,
      planId: plan._id,
      workoutId: workout._id,
      workoutTitle: workout.title,
      sport: workout.cardio.sport,
      date: dayOf(plan, workout) ?? today,
      completedSec: input.completedSec,
      roundsDone: input.roundsDone,
      roundsTotal: totals.rounds,
      highIntensitySec: input.highIntensitySec,
      distanceKm: input.distanceKm ?? null,
      rpe: input.rpe,
      note: input.note ?? null,
    });
    return toPublicLog(created.toObject() as LeanLog);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new CardioConflictError('cardio_log_exists');
    throw error;
  }
}

/** The coach's read of her cardio logs, newest first. */
export async function listCoachCardioLogs(traineeId: string): Promise<CoachCardioLogList> {
  const logs = await CardioLog.find({ traineeId }).sort({ date: -1, createdAt: -1 }).limit(COACH_CARDIO_LOG_LIMIT).lean<LeanLog[]>();
  return { items: logs.map(toPublicLog) };
}
