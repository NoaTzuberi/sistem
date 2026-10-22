import type { Types } from 'mongoose';
import type { CoachPumpPhoto, CoachStats, CoachStatsRange, PlanStatus } from '@sistem/types';
import { User } from '../users/user.model';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { Plan } from '../plans/plan.model';
import { addDays, currentWeekStart, localDateString } from '../plans/planWeek';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { PhotoStorageUnavailableError, toPublicPhoto } from '../privatePhotos/privatePhoto.service';
import { resolveTraineeStatus } from './coach.service';
import { buildCoachStats } from './coachStats';
import type { StatsLog, StatsPlan, StatsTrainee } from './coachStats';
import { listCoachCoachings } from '../coachings/coaching.service';

// GET /coach/stats: read-only aggregates for the dashboard's Statistics and Overview pages.
// Like everything in this folder it starts from the coach's OWN live coachings — plans and
// logs are only ever looked up by those trainee ids.

const PUMP_PREVIEW_COUNT = 3;

interface PlanRow {
  _id: Types.ObjectId;
  traineeId: Types.ObjectId;
  weekStartDate: string;
  status: PlanStatus;
  publishedAt?: Date | null;
  splitId?: string;
  workouts: { _id: Types.ObjectId; dayOfWeek?: number }[];
}

interface LogRow {
  _id: Types.ObjectId;
  traineeId: Types.ObjectId;
  planId: Types.ObjectId;
  workoutId: Types.ObjectId;
  workoutTitle: string;
  finishedAt?: Date | null;
  startedAt: Date;
  rating?: number;
  stats?: { prCount: number };
  pumpPhoto?: { publicId: string; uploadedAt: Date };
}

interface AnswersRow {
  userId: Types.ObjectId;
  answers?: { goals?: string[]; trainingFrequency?: { minDays?: number; maxDays?: number } };
}

/** The newest Daily Pump photos as signed links. Without photo storage (dev) the counts still work. */
function toPumpPhotos(logs: LogRow[], names: Map<string, string>): CoachPumpPhoto[] {
  try {
    return logs.slice(0, PUMP_PREVIEW_COUNT).map((log) => ({
      traineeId: String(log.traineeId),
      traineeName: names.get(String(log.traineeId)) ?? '',
      logId: String(log._id),
      workoutTitle: log.workoutTitle,
      photo: toPublicPhoto(log.pumpPhoto!),
    }));
  } catch (error) {
    if (error instanceof PhotoStorageUnavailableError) return [];
    throw error;
  }
}

export async function getCoachStats(coachId: string, range: CoachStatsRange, now: Date = new Date()): Promise<CoachStats> {
  // Her live coachings only; plans and logs are read through them (never another coach's records).
  const coachings = await listCoachCoachings(coachId);
  const coachingIds = coachings.map((coaching) => coaching._id);
  const [coach, users] = await Promise.all([
    User.findById(coachId).select('timezone').lean<{ timezone: string }>(),
    User.find({ _id: { $in: coachings.map((coaching) => coaching.traineeId) } }).select('name timezone createdAt onboardingStatus onboardingCompletedAt').lean<
      {
        _id: Types.ObjectId;
        name: string;
        timezone: string;
        createdAt: Date;
        onboardingStatus: string;
        onboardingCompletedAt?: Date | null;
      }[]
    >(),
  ]);
  if (!coach) throw new Error('Coach disappeared after the role check.');

  const ids = users.map((user) => user._id);
  const [planRows, logRows, answerRows] = await Promise.all([
    Plan.find({ coachingId: { $in: coachingIds } })
      .select('traineeId weekStartDate status publishedAt splitId workouts._id workouts.dayOfWeek')
      .lean<PlanRow[]>(),
    WorkoutLog.find({ coachingId: { $in: coachingIds }, status: 'completed' })
      .select('traineeId planId workoutId workoutTitle startedAt finishedAt rating stats.prCount pumpPhoto')
      .lean<LogRow[]>(),
    OnboardingResponse.find({ userId: { $in: ids } }).select('userId answers.goals answers.trainingFrequency').lean<AnswersRow[]>(),
  ]);

  const plans: StatsPlan[] = planRows.map((plan) => ({
    id: String(plan._id),
    traineeId: String(plan.traineeId),
    weekStartDate: plan.weekStartDate,
    status: plan.status,
    publishedAt: plan.publishedAt ?? null,
    splitId: plan.splitId ?? null,
    workouts: plan.workouts.map((workout) => ({ id: String(workout._id), dayOfWeek: workout.dayOfWeek })),
  }));
  const plansByTrainee = new Map<string, StatsPlan[]>();
  for (const plan of plans) plansByTrainee.set(plan.traineeId, [...(plansByTrainee.get(plan.traineeId) ?? []), plan]);

  const logs: StatsLog[] = logRows.map((log) => ({
    id: String(log._id),
    traineeId: String(log.traineeId),
    planId: String(log.planId),
    workoutId: String(log.workoutId),
    finishedAt: log.finishedAt ?? log.startedAt,
    rating: log.rating,
    prCount: log.stats?.prCount ?? 0,
  }));

  const answersByTrainee = new Map(answerRows.map((row) => [String(row.userId), row.answers]));
  const trainees: StatsTrainee[] = users.map((user) => {
    const id = String(user._id);
    const answers = answersByTrainee.get(id);
    const frequency = answers?.trainingFrequency;
    return {
      id,
      timezone: user.timezone,
      createdAt: user.createdAt,
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
      // The same rule as the trainees list, so "active" means one thing everywhere.
      status: resolveTraineeStatus({
        onboardingCompleted: user.onboardingStatus === 'completed',
        currentWeek: currentWeekStart(user.timezone, now),
        plans: plansByTrainee.get(id) ?? [],
      }).status,
      goals: answers?.goals ?? [],
      daysPerWeek:
        frequency?.minDays !== undefined && frequency.maxDays !== undefined ? { min: frequency.minDays, max: frequency.maxDays } : null,
    };
  });

  const withPhoto = logRows
    .filter((log) => log.pumpPhoto)
    .sort((a, b) => b.pumpPhoto!.uploadedAt.getTime() - a.pumpPhoto!.uploadedAt.getTime());
  const yesterday = addDays(localDateString(now, coach.timezone), -1);

  return {
    ...buildCoachStats({ trainees, plans, logs, coachTimezone: coach.timezone, range, now }),
    pump: {
      newCount: withPhoto.filter((log) => localDateString(log.pumpPhoto!.uploadedAt, coach.timezone) >= yesterday).length,
      total: withPhoto.length,
      photos: toPumpPhotos(withPhoto, new Map(users.map((user) => [String(user._id), user.name]))),
    },
  };
}
