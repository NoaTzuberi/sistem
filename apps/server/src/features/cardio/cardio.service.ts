import mongoose from 'mongoose';
import type { Types } from 'mongoose';
import type {
  CardioLog as PublicCardioLog,
  CoachCardioLogList,
  OwnCardioWorkoutList,
  PlanCardio,
  SaveCardioLogPayload,
  TraineeCardioWorkoutResponse,
} from '@sistem/types';
import { OwnCardioWorkout } from './ownCardio.model';
import type { OwnCardioWorkoutDocument } from './ownCardio.model';
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
import { coachingIdsOf } from '../coachings/coaching.service';
import { getCoachName } from '../coachProfiles/coachProfile.service';

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
    planId: log.planId ? String(log.planId) : null,
    workoutId: log.workoutId ? String(log.workoutId) : null,
    ownWorkoutId: log.ownWorkoutId ? String(log.ownWorkoutId) : null,
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
  const [today, { plan, workout }] = await Promise.all([traineeToday(traineeId, now), findCardioWorkout(traineeId, planId, workoutId)]);
  // The coach shown is the one who planned this workout (the plan's coach), not "her current coach".
  const [log, coachName] = await Promise.all([
    CardioLog.findOne({ traineeId, planId, workoutId }).lean<LeanLog>(),
    getCoachName(plan.coachId),
  ]);
  const date = dayOf(plan, workout);
  const publicWorkout = toPublicPlan(plan).workouts.find((item) => item.id === workoutId);
  return {
    planId,
    ownWorkoutId: null,
    weekStartDate: plan.weekStartDate,
    workout: publicWorkout as TraineeCardioWorkoutResponse['workout'],
    date,
    status: resolveWorkoutStatus(date, plan.weekStartDate, today, log !== null),
    log: log ? toPublicLog(log) : null,
    coach: coachName ? { name: coachName } : null,
    canStart: !log && weekStartOf(today) === plan.weekStartDate,
  };
}

/**
 * Saves what she did, once per cardio workout, for a workout of this week (like a strength workout,
 * a missed one can still be done until the week ends). The workout's own numbers bound hers.
 */
export async function saveTraineeCardioLog(traineeId: string, input: SaveCardioLogPayload, now: Date = new Date()): Promise<PublicCardioLog> {
  if (input.ownWorkoutId) return saveOwnCardioLog(traineeId, input.ownWorkoutId, input, now);
  const [today, { plan, workout }, liveIds] = await Promise.all([
    traineeToday(traineeId, now),
    findCardioWorkout(traineeId, input.planId!, input.workoutId!),
    coachingIdsOf(traineeId),
  ]);
  if (plan.weekStartDate !== weekStartOf(today)) throw new CardioRequestError('cardio_log_week');
  // An ended coaching's plan is history: nothing new is logged into it.
  if (!liveIds.some((id) => id.equals(plan.coachingId))) throw new CardioNotFoundError('cardio_workout_not_found');

  const totals = cardioTotals((workout.cardio as PlanCardio).steps);
  if (input.roundsDone > totals.rounds || input.completedSec > totals.totalSec || input.highIntensitySec > Math.min(totals.highIntensitySec, input.completedSec)) {
    throw new CardioRequestError('cardio_log_invalid');
  }
  try {
    const created = await CardioLog.create({
      traineeId,
      planId: plan._id,
      coachingId: plan.coachingId,
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

/**
 * The coach's read of her cardio logs, newest first — those of HER coaching with this trainee, plus
 * the trainee's runs of her own cardio workouts (trainee-owned history; the workouts themselves stay hers).
 */
export async function listCoachCardioLogs(coachingId: string, traineeId: string): Promise<CoachCardioLogList> {
  const filter: Record<string, unknown> = { $or: [{ coachingId }, { traineeId, ownWorkoutId: { $type: 'objectId' } }] };
  const logs = await CardioLog.find(filter).sort({ date: -1, createdAt: -1 }).limit(COACH_CARDIO_LOG_LIMIT).lean<LeanLog[]>();
  return { items: logs.map(toPublicLog) };
}

// ---------------------------------------------------------------------------
// Her own cardio workouts (self-guided): trainee-owned, run any number of times.
// ---------------------------------------------------------------------------

type LeanOwn = OwnCardioWorkoutDocument & { _id: Types.ObjectId };

async function findOwnWorkout(traineeId: string, id: string): Promise<LeanOwn> {
  const workout = await OwnCardioWorkout.findOne({ _id: id, traineeId, archivedAt: null }).lean<LeanOwn>();
  if (!workout) throw new CardioNotFoundError('cardio_workout_not_found');
  return workout;
}

function toPublicCardio(cardio: OwnCardioWorkoutDocument['cardio']): PlanCardio {
  return { sport: cardio.sport, metric: cardio.metric, steps: cardio.steps as PlanCardio['steps'] };
}

export async function listOwnCardioWorkouts(traineeId: string): Promise<OwnCardioWorkoutList> {
  const workouts = await OwnCardioWorkout.find({ traineeId, archivedAt: null }).sort({ updatedAt: -1 }).lean<LeanOwn[]>();
  const runs = await CardioLog.aggregate<{ _id: Types.ObjectId; runs: number; last: string }>([
    { $match: { traineeId: new mongoose.Types.ObjectId(traineeId), ownWorkoutId: { $in: workouts.map((workout) => workout._id) } } },
    { $group: { _id: '$ownWorkoutId', runs: { $sum: 1 }, last: { $max: '$date' } } },
  ]);
  const byId = new Map(runs.map((entry) => [String(entry._id), entry]));
  return {
    items: workouts.map((workout) => ({
      id: String(workout._id),
      title: workout.title,
      cardio: toPublicCardio(workout.cardio),
      runs: byId.get(String(workout._id))?.runs ?? 0,
      lastRunDate: byId.get(String(workout._id))?.last ?? null,
      updatedAt: workout.updatedAt.toISOString(),
    })),
  };
}

export async function createOwnCardioWorkout(traineeId: string, input: { title: string; cardio: OwnCardioWorkoutDocument['cardio'] }): Promise<string> {
  const created = await OwnCardioWorkout.create({ traineeId, title: input.title, cardio: input.cardio });
  return String(created._id);
}

export async function updateOwnCardioWorkout(traineeId: string, id: string, input: { title: string; cardio: OwnCardioWorkoutDocument['cardio'] }): Promise<void> {
  const result = await OwnCardioWorkout.updateOne({ _id: id, traineeId, archivedAt: null }, { $set: { title: input.title, cardio: input.cardio } });
  if (result.matchedCount === 0) throw new CardioNotFoundError('cardio_workout_not_found');
}

/** Archived, never deleted: her runs of it keep their title. */
export async function archiveOwnCardioWorkout(traineeId: string, id: string, now: Date = new Date()): Promise<void> {
  const result = await OwnCardioWorkout.updateOne({ _id: id, traineeId, archivedAt: null }, { $set: { archivedAt: now } });
  if (result.matchedCount === 0) throw new CardioNotFoundError('cardio_workout_not_found');
}

/** The player's view of her own workout: always startable, each run is a new log for today. */
export async function getOwnCardioWorkout(traineeId: string, id: string, now: Date = new Date()): Promise<TraineeCardioWorkoutResponse> {
  const [today, workout] = await Promise.all([traineeToday(traineeId, now), findOwnWorkout(traineeId, id)]);
  return {
    planId: null,
    ownWorkoutId: String(workout._id),
    weekStartDate: null,
    workout: { id: String(workout._id), title: workout.title, order: 0, kind: 'cardio', cardio: toPublicCardio(workout.cardio), exercises: [] },
    date: today,
    status: 'upcoming',
    log: null,
    coach: null,
    canStart: true,
  };
}

async function saveOwnCardioLog(traineeId: string, ownWorkoutId: string, input: SaveCardioLogPayload, now: Date): Promise<PublicCardioLog> {
  const [today, workout] = await Promise.all([traineeToday(traineeId, now), findOwnWorkout(traineeId, ownWorkoutId)]);
  const totals = cardioTotals(toPublicCardio(workout.cardio).steps);
  if (input.roundsDone > totals.rounds || input.completedSec > totals.totalSec || input.highIntensitySec > Math.min(totals.highIntensitySec, input.completedSec)) {
    throw new CardioRequestError('cardio_log_invalid');
  }
  const created = await CardioLog.create({
    traineeId,
    ownWorkoutId: workout._id,
    workoutTitle: workout.title,
    sport: workout.cardio.sport,
    date: today,
    completedSec: input.completedSec,
    roundsDone: input.roundsDone,
    roundsTotal: totals.rounds,
    highIntensitySec: input.highIntensitySec,
    distanceKm: input.distanceKm ?? null,
    rpe: input.rpe,
    note: input.note ?? null,
  });
  return toPublicLog(created.toObject() as LeanLog);
}
