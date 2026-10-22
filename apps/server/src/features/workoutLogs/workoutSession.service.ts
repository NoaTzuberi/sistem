import { Types } from 'mongoose';
import type {
  ActiveWorkoutRef,
  LastPerformance,
  PlanWorkout,
  WorkoutLog as PublicWorkoutLog,
  WorkoutLogSetUpdate,
  WorkoutSession,
} from '@sistem/types';
import { emitAppEvent } from '../../events/appEvents';
import { Plan } from '../plans/plan.model';
import { PlanNotFoundError, attachExerciseFacts, toPublicPlan } from '../plans/plan.service';
import type { LeanPlan } from '../plans/plan.service';
import { weekStartOf } from '../plans/planWeek';
import { todayFor } from '../plans/traineePlan.service';
import { detectPersonalRecordsForLog, savePersonalRecords } from '../personalRecords/personalRecord.service';
import { evaluateAchievementsSafely } from '../achievements/achievement.service';
import { WorkoutLog } from './workoutLog.model';
import { WorkoutLogNotFoundError, attachLogDetails, attachLogExerciseFacts, toPublicWorkoutLog } from './workoutLog.service';
import type { WorkoutLogDocument, WorkoutLogSetFields } from './workoutLog.types';
import { LAST_PERFORMANCE_LOG_SCAN, MAX_SETS_PER_EXERCISE } from './workoutLog.constants';
import { LocalizedError } from '../../i18n';
import { coachingIdsOf } from '../coachings/coaching.service';
import { freeSessionWorkout } from './freeWorkoutSession';

// The active workout session (PRD §5.2). The log is created the moment a workout
// starts and every set change is saved as it happens, so a closed app, a lost
// connection or a second device never loses logged sets. All times are server times.

export class WorkoutNotStartableError extends LocalizedError {}
export class WorkoutLogNotActiveError extends LocalizedError {}
export class NothingCompletedError extends LocalizedError {}
export class UnknownLogSetError extends LocalizedError {}
export class OtherWorkoutActiveError extends Error {
  constructor(readonly activeLog: ActiveWorkoutRef) {
    super('Another workout is still open. Resume it or discard it first.');
  }
}

export type LeanWorkoutLog = WorkoutLogDocument & { _id: Types.ObjectId };

const DUPLICATE_KEY_ERROR = 11000;

export function toActiveRef(log: LeanWorkoutLog): ActiveWorkoutRef {
  return {
    logId: String(log._id),
    source: log.source ?? 'plan',
    planId: log.planId ? String(log.planId) : null,
    workoutId: log.workoutId ? String(log.workoutId) : null,
    workoutTitle: log.workoutTitle,
    startedAt: log.startedAt.toISOString(),
  };
}

/** The planned workout with exercise facts and resolvedSets, or null if it left the plan. */
async function loadPlannedWorkout(plan: LeanPlan, workoutId: string): Promise<PlanWorkout | null> {
  const publicPlan = toPublicPlan(plan);
  await attachExerciseFacts([publicPlan]);
  return publicPlan.workouts.find((workout) => workout.id === workoutId) ?? null;
}

/**
 * The set that best stands for a past performance: a working set when there is one
 * (a warm-up or a drop set would understate it), then the heaviest, then the most
 * reps or the longest hold.
 */
function pickRepresentativeSet(sets: WorkoutLogSetFields[]): WorkoutLogSetFields {
  const working = sets.filter((set) => set.type === undefined || set.type === 'working');
  const candidates = working.length > 0 ? working : sets;
  return [...candidates].sort(
    (a, b) =>
      (b.weight ?? 0) - (a.weight ?? 0) ||
      (b.reps ?? 0) - (a.reps ?? 0) ||
      (b.durationSec ?? 0) - (a.durationSec ?? 0),
  )[0];
}

/** Her most recent completed performance of each exercise — "Last time" and the weight pre-fill. */
export async function findLastPerformance(
  traineeId: string,
  exerciseIds: string[],
  excludeLogId?: Types.ObjectId,
  /** Coach reads: only that coaching's logs. Her own session pre-fill uses her whole history. */
  coachingId?: string,
): Promise<Record<string, LastPerformance>> {
  const result: Record<string, LastPerformance> = {};
  if (exerciseIds.length === 0) return result;

  const filter: Record<string, unknown> = { traineeId, status: 'completed', 'sets.exerciseId': { $in: exerciseIds } };
  if (coachingId) filter.coachingId = coachingId;
  if (excludeLogId) filter._id = { $ne: excludeLogId };
  const logs = await WorkoutLog.find(filter)
    .sort({ finishedAt: -1 })
    .limit(LAST_PERFORMANCE_LOG_SCAN)
    .select('sets finishedAt')
    .lean<Pick<LeanWorkoutLog, 'sets' | 'finishedAt'>[]>();

  for (const exerciseId of exerciseIds) {
    for (const log of logs) {
      const done = log.sets.filter((set) => set.completed && String(set.exerciseId) === exerciseId);
      if (done.length === 0 || !log.finishedAt) continue;
      const best = pickRepresentativeSet(done);
      result[exerciseId] = {
        ...(best.reps !== undefined && { reps: best.reps }),
        ...(best.weight !== undefined && { weight: best.weight }),
        ...(best.durationSec !== undefined && { durationSec: best.durationSec }),
        finishedAt: log.finishedAt.toISOString(),
      };
      break;
    }
  }
  return result;
}

async function sessionWorkout(log: LeanWorkoutLog): Promise<PlanWorkout> {
  if (log.source === 'free') return freeSessionWorkout(log);
  const plan = await Plan.findOne({ _id: log.planId, traineeId: log.traineeId }).lean<LeanPlan>();
  const planned = plan ? await loadPlannedWorkout(plan, String(log.workoutId)) : null;
  // A plan with a log can't be deleted (Phase 6), so this fallback is only a safety net.
  return planned ?? { id: String(log.workoutId), title: log.workoutTitle, order: 0, exercises: [] };
}

export async function toSession(log: LeanWorkoutLog, now: Date): Promise<WorkoutSession> {
  const workout = await sessionWorkout(log);

  const publicLog = toPublicWorkoutLog(log);
  const exerciseIds = [...new Set(log.sets.map((set) => String(set.exerciseId)))];
  const [lastPerformance] = await Promise.all([
    findLastPerformance(String(log.traineeId), exerciseIds, log._id),
    attachLogExerciseFacts([publicLog]),
  ]);

  return { log: publicLog, workout, lastPerformance, serverTime: now.toISOString() };
}

export async function findOwnLog(logId: string, traineeId: string): Promise<LeanWorkoutLog> {
  const log = await WorkoutLog.findOne({ _id: logId, traineeId }).lean<LeanWorkoutLog>();
  if (!log) throw new WorkoutLogNotFoundError('workout_log_not_found');
  return log;
}

export async function getActiveSession(traineeId: string, now: Date = new Date()): Promise<WorkoutSession | null> {
  const log = await WorkoutLog.findOne({ traineeId, status: 'in_progress' }).lean<LeanWorkoutLog>();
  return log ? toSession(log, now) : null;
}

/** Any of her logs — the screen sends her to the log page when it is no longer open. */
export async function getSession(logId: string, traineeId: string, now: Date = new Date()): Promise<WorkoutSession> {
  return toSession(await findOwnLog(logId, traineeId), now);
}

/**
 * Starts a workout of this week's published plan, or resumes it if it is already open.
 * Sets are pre-filled from the server's resolvedSets: reps from the target (the low end
 * of a range), weight from the target — or, when the coach set none, the weight she
 * lifted last time.
 */
export async function startWorkout(
  traineeId: string,
  planId: string,
  workoutId: string,
  now: Date = new Date(),
): Promise<{ session: WorkoutSession; resumed: boolean }> {
  const active = await WorkoutLog.findOne({ traineeId, status: 'in_progress' }).lean<LeanWorkoutLog>();
  if (active) {
    if (active.source !== 'free' && String(active.planId) === planId && String(active.workoutId) === workoutId) {
      return { session: await toSession(active, now), resumed: true };
    }
    throw new OtherWorkoutActiveError(toActiveRef(active));
  }

  // Only plans of a LIVE coaching start: an ended coaching's plans are history.
  const [plan, today] = await Promise.all([
    Plan.findOne({ _id: planId, traineeId, status: 'published', coachingId: { $in: await coachingIdsOf(traineeId) } }).lean<LeanPlan>(),
    todayFor(traineeId, now),
  ]);
  if (!plan) throw new PlanNotFoundError('plan_not_found');
  const workout = await loadPlannedWorkout(plan, workoutId);
  // A cardio workout runs in its own player and is logged as a cardio log, never as sets.
  if (!workout || workout.kind === 'cardio') throw new PlanNotFoundError('workout_not_found');

  // Same rule as Home: a workout is doable until its week ends, never before it starts.
  if (plan.weekStartDate !== weekStartOf(today)) {
    throw new WorkoutNotStartableError('workout_not_this_week');
  }
  if (await WorkoutLog.exists({ traineeId, planId, workoutId, status: 'completed' })) {
    throw new WorkoutNotStartableError('workout_already_done');
  }

  const exerciseIds = [...new Set(workout.exercises.map((exercise) => exercise.exerciseId))];
  const lastPerformance = await findLastPerformance(traineeId, exerciseIds);
  const sets = workout.exercises.flatMap((exercise) =>
    exercise.resolvedSets.map((set) => ({
      exerciseId: exercise.exerciseId,
      planExerciseId: exercise.id,
      setIndex: set.setIndex,
      type: set.type,
      reps: set.reps,
      durationSec: set.durationSec,
      weight: set.targetWeight ?? lastPerformance[exercise.exerciseId]?.weight,
      completed: false,
    })),
  );

  try {
    const created = await WorkoutLog.create({
      traineeId,
      planId,
      coachingId: plan.coachingId,
      workoutId,
      workoutTitle: workout.title,
      startedAt: now,
      sets,
    });
    return { session: await toSession(created.toObject() as LeanWorkoutLog, now), resumed: false };
  } catch (error) {
    // Two devices tapped Start at once: the unique index let only one through.
    if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) {
      return startWorkout(traineeId, planId, workoutId, now);
    }
    throw error;
  }
}

export async function assertActive(logId: string, traineeId: string): Promise<LeanWorkoutLog> {
  const log = await findOwnLog(logId, traineeId);
  if (log.status !== 'in_progress') {
    throw new WorkoutLogNotActiveError('workout_not_in_progress');
  }
  return log;
}

function findLogSetIndex(log: LeanWorkoutLog, update: WorkoutLogSetUpdate): number {
  return log.sets.findIndex(
    (set) => String(set.planExerciseId) === update.planExerciseId && set.setIndex === update.setIndex,
  );
}

/**
 * "+ Extra set": an update for the set right after an exercise's last one adds that set
 * (a working set, not part of the plan). Only the next index is accepted, so a typo can't
 * open a gap, and an exercise never grows past MAX_SETS_PER_EXERCISE.
 */
function extraSetsToAdd(log: LeanWorkoutLog, updates: WorkoutLogSetUpdate[], now: Date): WorkoutLogSetFields[] {
  const lastIndex = new Map<string, { setIndex: number; exerciseId: Types.ObjectId; count: number }>();
  for (const set of log.sets) {
    if (!set.planExerciseId) continue;
    const key = String(set.planExerciseId);
    const current = lastIndex.get(key);
    lastIndex.set(key, {
      setIndex: Math.max(current?.setIndex ?? -1, set.setIndex),
      exerciseId: set.exerciseId,
      count: (current?.count ?? 0) + 1,
    });
  }

  const added: WorkoutLogSetFields[] = [];
  const unknown = updates
    .filter((update) => findLogSetIndex(log, update) === -1)
    .sort((a, b) => a.setIndex - b.setIndex);
  for (const update of unknown) {
    const last = lastIndex.get(update.planExerciseId);
    if (!last || update.setIndex !== last.setIndex + 1 || last.count >= MAX_SETS_PER_EXERCISE) {
      throw new UnknownLogSetError('workout_set_unknown', { n: update.setIndex + 1 });
    }
    added.push({
      exerciseId: last.exerciseId,
      planExerciseId: new Types.ObjectId(update.planExerciseId),
      setIndex: update.setIndex,
      type: 'working',
      ...(typeof update.reps === 'number' && { reps: update.reps }),
      ...(typeof update.weight === 'number' && { weight: update.weight }),
      ...(typeof update.durationSec === 'number' && { durationSec: update.durationSec }),
      completed: update.completed,
      ...(update.completed && { completedAt: now }),
    });
    lastIndex.set(update.planExerciseId, { ...last, setIndex: update.setIndex, count: last.count + 1 });
  }
  return added;
}

/**
 * Adds the extra sets in their own conditional update (a $push can't share an update with
 * $set on the same array). The filter also refuses an index another device added first:
 * then the caller retries, and the set is simply updated.
 */
async function pushExtraSets(log: LeanWorkoutLog, added: WorkoutLogSetFields[]): Promise<boolean> {
  const result = await WorkoutLog.updateOne(
    {
      _id: log._id,
      status: 'in_progress',
      $nor: added.map((set) => ({ sets: { $elemMatch: { planExerciseId: set.planExerciseId, setIndex: set.setIndex } } })),
    },
    { $push: { sets: { $each: added } } },
    { runValidators: true },
  );
  return result.matchedCount > 0;
}

/**
 * Applies set changes with one conditional update, so a change that arrives after the
 * workout was finished on another device is refused instead of rewriting history, and
 * two devices editing different sets never overwrite each other.
 */
async function applySetUpdates(log: LeanWorkoutLog, updates: WorkoutLogSetUpdate[], now: Date, retried = false): Promise<void> {
  if (updates.length === 0) return;

  const added = extraSetsToAdd(log, updates, now);
  if (added.length > 0) {
    if (!(await pushExtraSets(log, added))) {
      // Finished elsewhere (assertActive throws), or another device added the same set: update it instead.
      if (retried) throw new WorkoutLogNotActiveError('workout_not_in_progress');
      return applySetUpdates(await assertActive(String(log._id), String(log.traineeId)), updates, now, true);
    }
  }
  const remaining = updates.filter((update) => findLogSetIndex(log, update) !== -1);
  if (remaining.length === 0) return;

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  for (const update of remaining) {
    const index = findLogSetIndex(log, update);
    const path = `sets.${index}`;
    for (const field of ['reps', 'weight', 'durationSec'] as const) {
      const value = update[field];
      if (value === null) $unset[`${path}.${field}`] = '';
      else if (value !== undefined) $set[`${path}.${field}`] = value;
    }
    $set[`${path}.completed`] = update.completed;
    if (!update.completed) $unset[`${path}.completedAt`] = '';
    else if (!log.sets[index].completed) $set[`${path}.completedAt`] = now;
  }

  const result = await WorkoutLog.updateOne(
    { _id: log._id, status: 'in_progress' },
    { $set, ...(Object.keys($unset).length > 0 && { $unset }) },
    { runValidators: true },
  );
  if (result.matchedCount === 0) {
    throw new WorkoutLogNotActiveError('workout_not_in_progress');
  }
}

export async function updateWorkoutSets(
  logId: string,
  traineeId: string,
  updates: WorkoutLogSetUpdate[],
  now: Date = new Date(),
): Promise<PublicWorkoutLog> {
  await applySetUpdates(await assertActive(logId, traineeId), updates, now);
  return toPublicWorkoutLog(await findOwnLog(logId, traineeId));
}

/** The plan exercises of this log's workout that run as intervals (on the coach's clock). */
async function intervalPlanExerciseIds(log: LeanWorkoutLog): Promise<Set<string>> {
  // A free workout has no intervals (they are set by a coach).
  if (log.source === 'free') return new Set();
  const plan = await Plan.findOne({ _id: log.planId, traineeId: log.traineeId }).select('workouts').lean<LeanPlan>();
  const workout = plan?.workouts.find((candidate) => String(candidate._id) === String(log.workoutId));
  return new Set(workout?.exercises.filter((exercise) => exercise.interval).map((exercise) => String(exercise._id)) ?? []);
}

/**
 * Finishes the session: takes the last unsent set changes, then closes the log with
 * server-side stats and PRs (compared with all her earlier workouts). Sets she didn't
 * do stay in the log as not done — the coach sees what was skipped.
 */
export async function finishWorkout(
  logId: string,
  traineeId: string,
  updates: WorkoutLogSetUpdate[] = [],
  now: Date = new Date(),
): Promise<PublicWorkoutLog> {
  await applySetUpdates(await assertActive(logId, traineeId), updates, now);
  const log = await findOwnLog(logId, traineeId);

  const done = log.sets.filter((set) => set.completed);
  if (done.length === 0) {
    throw new NothingCompletedError('workout_nothing_completed');
  }
  const records = await detectPersonalRecordsForLog(
    log.traineeId,
    log._id,
    log.sets.map((set) => ({
      ...set,
      exerciseId: String(set.exerciseId),
      planExerciseId: set.planExerciseId ? String(set.planExerciseId) : undefined,
    })),
    await intervalPlanExerciseIds(log),
  );
  const stats = {
    durationSec: Math.max(0, Math.round((now.getTime() - log.startedAt.getTime()) / 1000)),
    totalVolume: done.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0),
    setsCompleted: done.length,
    prCount: records.length,
  };

  const result = await WorkoutLog.updateOne(
    { _id: log._id, status: 'in_progress' },
    { $set: { status: 'completed', finishedAt: now, stats } },
  );
  if (result.matchedCount === 0) {
    throw new WorkoutLogNotActiveError('workout_not_in_progress');
  }
  // After the conditional update: only the one finish that closed the log records PRs.
  await savePersonalRecords(log.traineeId, log._id, records, now);
  // After the PRs, which some rules read. The summary shows what this log unlocked.
  await evaluateAchievementsSafely(traineeId, now);

  emitAppEvent('workout.completed', { logId, traineeId, workoutTitle: log.workoutTitle, finishedAt: now });

  const finished = toPublicWorkoutLog(await findOwnLog(logId, traineeId));
  await attachLogDetails([finished]);
  return finished;
}

/** Discard: the log is kept (status 'abandoned') but leaves her history; the workout can start fresh. */
export async function abandonWorkout(logId: string, traineeId: string, now: Date = new Date()): Promise<PublicWorkoutLog> {
  const log = await assertActive(logId, traineeId);
  const result = await WorkoutLog.updateOne(
    { _id: log._id, status: 'in_progress' },
    { $set: { status: 'abandoned', finishedAt: now } },
  );
  if (result.matchedCount === 0) {
    throw new WorkoutLogNotActiveError('workout_not_in_progress');
  }
  return toPublicWorkoutLog(await findOwnLog(logId, traineeId));
}
