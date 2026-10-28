import type { Types } from 'mongoose';
import type { CoachArchivedTrainee, CoachArchivedTraineeResponse, WorkoutLog as PublicWorkoutLog } from '@sistem/types';
import { User } from '../users/user.model';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { toMyOnboarding } from '../onboarding/onboarding.service';
import { Coaching } from '../coachings/coaching.model';
import { endCoaching } from '../coachings/coaching.service';
import type { LeanCoaching } from '../coachings/coaching.service';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { attachLogDetails, toPublicWorkoutLog } from '../workoutLogs/workoutLog.service';
import { emitAppEvent } from '../../events/appEvents';

// Ending a coaching and the coach's read-only archive of it. Access after the end is decided here and in
// loadCoachArchivedTrainee — never by the UI: only records of THAT coaching from before its end, no photos
// (her profile photo, Daily Pump, body / meal photos), nothing trainee-owned she adds later.

type LeanLog = Parameters<typeof toPublicWorkoutLog>[0];

/**
 * Ends the live coaching (after loadCoachTrainee: it is this coach's). Her account, plans and logs stay;
 * she is notified. Returns the end time — or null when it had already ended (a double tap).
 */
export async function endCoachingByCoach(coachId: string, traineeId: string, coachingId: string, now: Date = new Date()): Promise<Date | null> {
  if (!(await endCoaching(coachingId, now))) return null;
  emitAppEvent('coaching.ended', { coachingId, traineeId, coachId, endedAt: now });
  return now;
}

interface ArchiveRow {
  coaching: LeanCoaching;
  user: { _id: Types.ObjectId; name: string; email: string; timezone: string };
}

/** Her newest completed workout of each coaching, up to its end. */
async function lastCompletedByCoaching(coachings: LeanCoaching[]): Promise<Map<string, Date>> {
  if (coachings.length === 0) return new Map();
  const rows = await WorkoutLog.aggregate<{ _id: Types.ObjectId; at: Date }>([
    { $match: { coachingId: { $in: coachings.map((coaching) => coaching._id) }, status: 'completed' } },
    { $group: { _id: '$coachingId', at: { $max: { $ifNull: ['$finishedAt', '$startedAt'] } } } },
  ]);
  const ends = new Map(coachings.map((coaching) => [String(coaching._id), coaching.endedAt]));
  const latest = new Map<string, Date>();
  for (const row of rows) {
    const end = ends.get(String(row._id));
    if (end && row.at <= end) latest.set(String(row._id), row.at);
  }
  return latest;
}

function toArchivedTrainee({ coaching, user }: ArchiveRow, lastCompletedAt: Date | null): CoachArchivedTrainee {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    coachingId: String(coaching._id),
    coachingStartedAt: coaching.startedAt.toISOString(),
    coachingEndedAt: (coaching.endedAt ?? coaching.updatedAt).toISOString(),
    lastCompletedAt: lastCompletedAt?.toISOString() ?? null,
  };
}

/**
 * Her ended coachings — one per trainee (the newest ending), newest first. A trainee who came back
 * with a new invite is in the live list instead, so she is left out here.
 */
export async function listArchivedTrainees(coachId: string): Promise<CoachArchivedTrainee[]> {
  const [ended, liveTraineeIds] = await Promise.all([
    Coaching.find({ coachId, status: 'ended' }).sort({ endedAt: -1 }).lean<LeanCoaching[]>(),
    Coaching.distinct('traineeId', { coachId, live: true }),
  ]);
  const live = new Set(liveTraineeIds.map(String));
  const newest = new Map<string, LeanCoaching>();
  for (const coaching of ended) {
    const key = String(coaching.traineeId);
    if (!live.has(key) && !newest.has(key)) newest.set(key, coaching);
  }
  const coachings = [...newest.values()];
  const [users, lastCompleted] = await Promise.all([
    User.find({ _id: { $in: coachings.map((coaching) => coaching.traineeId) } }).select('name email timezone').lean<ArchiveRow['user'][]>(),
    lastCompletedByCoaching(coachings),
  ]);
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return coachings.flatMap((coaching) => {
    const user = byId.get(String(coaching.traineeId));
    return user ? [toArchivedTrainee({ coaching, user }, lastCompleted.get(String(coaching._id)) ?? null)] : [];
  });
}

/** After loadCoachArchivedTrainee (it set the ended coaching): her card + the questionnaire. */
export async function getArchivedTrainee(traineeId: string, coachingId: string): Promise<CoachArchivedTraineeResponse['trainee']> {
  const [user, coaching, response] = await Promise.all([
    User.findById(traineeId),
    Coaching.findById(coachingId).lean<LeanCoaching>(),
    OnboardingResponse.findOne({ userId: traineeId }).lean(),
  ]);
  if (!user || !coaching) throw new Error('Trainee disappeared after the archive check.');
  const lastCompleted = await lastCompletedByCoaching([coaching]);
  return {
    ...toArchivedTrainee({ coaching, user }, lastCompleted.get(coachingId) ?? null),
    onboarding: response || user.onboardingStatus !== 'not_started' ? toMyOnboarding(user, response) : null,
  };
}

/**
 * The ended coaching's workout logs from before its end — her free workouts are trainee-owned, so they
 * are left out — and no Daily Pump photo (private photos end with the coaching).
 */
export async function listArchivedWorkoutLogs(coachingId: string): Promise<PublicWorkoutLog[]> {
  const coaching = await Coaching.findById(coachingId).select('endedAt').lean();
  if (!coaching?.endedAt) return [];
  const logs = await WorkoutLog.find({ coachingId, status: { $ne: 'abandoned' }, startedAt: { $lte: coaching.endedAt } })
    .sort({ startedAt: -1 })
    .lean<LeanLog[]>();
  const publicLogs = logs.map((log) => ({ ...toPublicWorkoutLog(log), pumpPhoto: null }));
  await attachLogDetails(publicLogs);
  return publicLogs;
}
