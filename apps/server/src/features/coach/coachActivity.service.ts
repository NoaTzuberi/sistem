import type { Types } from 'mongoose';
import type { CoachActivityItem, CoachActivityPage, CoachActivityRecord, CoachActivityTrainee, OnboardingStatus, PrivatePhoto } from '@sistem/types';
import { User } from '../users/user.model';
import { toPublicAvatar } from '../users/avatar';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { CardioLog } from '../cardio/cardio.model';
import { MealLog } from '../mealLogs/mealLog.model';
import { BodyMetric } from '../bodyMetrics/bodyMetric.model';
import { PersonalRecord } from '../personalRecords/personalRecord.model';
import { Exercise } from '../exercises/exercise.model';
import { PhotoStorageUnavailableError, toPublicPhoto } from '../privatePhotos/privatePhoto.service';
import { listCoachCoachings } from '../coachings/coaching.service';

/**
 * GET /coach/activity: the coach mode feed, newest first, built when read from the records that already
 * exist — no event store. Sources, each scoped like the coach's other reads (her LIVE coachings; ended
 * ones never show):
 *  - finished strength workouts and cardio runs: logs of her coachings + the trainee's own free / own-cardio
 *    logs (trainee-owned history);
 *  - Daily Pump photos (on the log), meal photos (one item per day), progress photos (one item per day);
 *  - measurements (one item per day of body tracking);
 *  - the coaching itself (she joined through the coach's link or code).
 * Trainee-owned records count only from the day she joined this coach — the feed is the coaching's story.
 *
 * Paging: every source returns its newest `limit` items older than `before`; the merge keeps the newest
 * `limit`, and the next page starts below the last one. (Two events at the very same millisecond on a page
 * edge could hide one — accepted, events are seconds apart in practice.)
 */

export const DEFAULT_ACTIVITY_PAGE_SIZE = 20;
export const MAX_ACTIVITY_PAGE_SIZE = 50;

/** A body day whose last change is this close to a photo upload changed only its photos. */
const PHOTO_ONLY_CHANGE_MS = 2000;

type Event = Omit<CoachActivityItem, 'trainee'> & { traineeId: string };

interface Scope {
  coachingIds: Types.ObjectId[];
  traineeIds: Types.ObjectId[];
  /** When each trainee joined this coach. */
  joins: { traineeId: Types.ObjectId; startedAt: Date }[];
}

/**
 * One source's newest rows. `full` = it returned `limit` rows, so older ones may exist below `oldest`
 * (the time of its last row, before any filtering) — the merged page never reaches below that.
 */
interface SourcePage {
  events: Event[];
  full: boolean;
  oldest: string | null;
}

function sourcePage(events: Event[], rawCount: number, rawOldest: Date | null, limit: number): SourcePage {
  return { events, full: rawCount >= limit, oldest: rawOldest ? rawOldest.toISOString() : null };
}

/** Trainee-owned records count from the moment she joined this coach (one clause per trainee). */
function sinceJoined(scope: Scope, field: string, extra: Record<string, unknown> = {}) {
  return scope.joins.map((join) => ({ traineeId: join.traineeId, ...extra, [field]: { $gte: join.startedAt } }));
}

function signedPhotos(photos: { publicId: string; uploadedAt: Date }[]): PrivatePhoto[] {
  try {
    return photos.map(toPublicPhoto);
  } catch (error) {
    if (error instanceof PhotoStorageUnavailableError) return [];
    throw error;
  }
}

async function workoutEvents(scope: Scope, before: Date, limit: number): Promise<SourcePage> {
  type Row = {
    _id: Types.ObjectId;
    traineeId: Types.ObjectId;
    source?: 'plan' | 'free';
    workoutTitle: string;
    finishedAt: Date;
    rating?: number;
    stats?: { durationSec: number; setsCompleted: number; prCount: number };
  };
  const logs = await WorkoutLog.find({
    status: 'completed',
    finishedAt: { $lt: before },
    $or: [{ coachingId: { $in: scope.coachingIds } }, ...sinceJoined(scope, 'finishedAt', { source: 'free' })],
  })
    .sort({ finishedAt: -1 })
    .limit(limit)
    .select('traineeId source workoutTitle finishedAt rating stats')
    .lean<Row[]>();

  const records = await PersonalRecord.find({ logId: { $in: logs.filter((log) => (log.stats?.prCount ?? 0) > 0).map((log) => log._id) } })
    .select('logId exerciseId type newValue')
    .lean<{ logId: Types.ObjectId; exerciseId: Types.ObjectId; type: CoachActivityRecord['type']; newValue: number }[]>();
  const names = new Map(
    (await Exercise.find({ _id: { $in: records.map((record) => record.exerciseId) } }).select('name').lean<{ _id: Types.ObjectId; name: string }[]>()).map(
      (exercise) => [String(exercise._id), exercise.name],
    ),
  );
  // One record per log for the chip: a weight record first, then reps, then duration.
  const order: CoachActivityRecord['type'][] = ['weight', 'reps', 'duration'];
  const best = new Map<string, CoachActivityRecord>();
  for (const record of [...records].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))) {
    const key = String(record.logId);
    if (!best.has(key)) best.set(key, { exerciseName: names.get(String(record.exerciseId)) ?? '', type: record.type, value: record.newValue });
  }

  const events: Event[] = logs.map((log) => ({
    id: `workout_completed:${log._id}`,
    at: log.finishedAt.toISOString(),
    traineeId: String(log.traineeId),
    type: 'workout_completed',
    logId: String(log._id),
    workoutTitle: log.workoutTitle,
    free: log.source === 'free',
    setsCompleted: log.stats?.setsCompleted ?? 0,
    durationSec: log.stats?.durationSec ?? 0,
    rating: log.rating ?? null,
    prCount: log.stats?.prCount ?? 0,
    record: best.get(String(log._id)) ?? null,
  }));
  return sourcePage(events, logs.length, logs.at(-1)?.finishedAt ?? null, limit);
}

async function pumpEvents(scope: Scope, before: Date, limit: number): Promise<SourcePage> {
  type Row = { _id: Types.ObjectId; traineeId: Types.ObjectId; pumpPhoto: { publicId: string; uploadedAt: Date } };
  const logs = await WorkoutLog.find({
    'pumpPhoto.uploadedAt': { $lt: before },
    status: 'completed',
    $or: [{ coachingId: { $in: scope.coachingIds } }, ...sinceJoined(scope, 'pumpPhoto.uploadedAt', { source: 'free' })],
  })
    .sort({ 'pumpPhoto.uploadedAt': -1 })
    .limit(limit)
    .select('traineeId pumpPhoto')
    .lean<Row[]>();
  const events: Event[] = logs.map((log) => ({
    id: `photos_uploaded:pump:${log._id}`,
    at: log.pumpPhoto.uploadedAt.toISOString(),
    traineeId: String(log.traineeId),
    type: 'photos_uploaded',
    source: 'pump',
    date: null,
    logId: String(log._id),
    count: 1,
    photos: signedPhotos([log.pumpPhoto]),
  }));
  return sourcePage(events, logs.length, logs.at(-1)?.pumpPhoto.uploadedAt ?? null, limit);
}

async function cardioEvents(scope: Scope, before: Date, limit: number): Promise<SourcePage> {
  type Row = {
    _id: Types.ObjectId;
    traineeId: Types.ObjectId;
    workoutTitle: string;
    createdAt: Date;
    completedSec: number;
    roundsDone: number;
    roundsTotal: number;
    distanceKm?: number | null;
  };
  const logs = await CardioLog.find({
    createdAt: { $lt: before },
    $or: [{ coachingId: { $in: scope.coachingIds } }, ...sinceJoined(scope, 'createdAt', { ownWorkoutId: { $type: 'objectId' } })],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('traineeId workoutTitle createdAt completedSec roundsDone roundsTotal distanceKm')
    .lean<Row[]>();
  const events: Event[] = logs.map((log) => ({
    id: `cardio_completed:${log._id}`,
    at: log.createdAt.toISOString(),
    traineeId: String(log.traineeId),
    type: 'cardio_completed',
    logId: String(log._id),
    workoutTitle: log.workoutTitle,
    completedSec: log.completedSec,
    roundsDone: log.roundsDone,
    roundsTotal: log.roundsTotal,
    distanceKm: log.distanceKm ?? null,
  }));
  return sourcePage(events, logs.length, logs.at(-1)?.createdAt ?? null, limit);
}

/** Meal photos: one item per trainee day, at its newest photo. Plan days of her coachings + own-target days. */
async function mealPhotoEvents(scope: Scope, before: Date, limit: number): Promise<SourcePage> {
  type Row = { _id: Types.ObjectId; traineeId: Types.ObjectId; date: string; at: Date; photos: { publicId: string; uploadedAt: Date }[] };
  const rows = await MealLog.aggregate<Row>([
    { $match: { traineeId: { $in: scope.traineeIds }, 'photos.0': { $exists: true } } },
    { $addFields: { at: { $max: '$photos.uploadedAt' } } },
    {
      $match: {
        at: { $lt: before },
        $or: [{ coachingId: { $in: scope.coachingIds } }, ...sinceJoined(scope, 'at', { source: 'own' })],
      },
    },
    { $sort: { at: -1 } },
    { $limit: limit },
    { $project: { traineeId: 1, date: 1, at: 1, photos: { publicId: 1, uploadedAt: 1 } } },
  ]);
  const events: Event[] = rows.map((row) => ({
    id: `photos_uploaded:meal:${row._id}`,
    at: row.at.toISOString(),
    traineeId: String(row.traineeId),
    type: 'photos_uploaded',
    source: 'meal',
    date: row.date,
    logId: null,
    count: row.photos.length,
    photos: signedPhotos([...row.photos].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())),
  }));
  return sourcePage(events, rows.length, rows.at(-1)?.at ?? null, limit);
}

type BodyRow = {
  _id: Types.ObjectId;
  traineeId: Types.ObjectId;
  date: string;
  weight?: number;
  measurements?: Record<string, number>;
  photos: { publicId: string; uploadedAt: Date }[];
  startingPhoto?: { publicId: string; uploadedAt: Date };
  updatedAt: Date;
  photoAt?: Date | null;
};

/** Progress photos (incl. her starting photo): one item per day, at its newest photo. Trainee-owned. */
async function progressPhotoEvents(scope: Scope, before: Date, limit: number): Promise<SourcePage> {
  const rows = await BodyMetric.aggregate<BodyRow>([
    { $match: { traineeId: { $in: scope.traineeIds } } },
    { $addFields: { photoAt: { $max: { $concatArrays: ['$photos.uploadedAt', { $ifNull: [['$startingPhoto.uploadedAt'], []] }] } } } },
    { $match: { photoAt: { $lt: before }, $or: sinceJoined(scope, 'photoAt') } },
    { $sort: { photoAt: -1 } },
    { $limit: limit },
  ]);
  const events: Event[] = rows.map((row) => {
    const photos = [...row.photos, ...(row.startingPhoto ? [row.startingPhoto] : [])].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    return {
      id: `photos_uploaded:progress:${row._id}`,
      at: row.photoAt!.toISOString(),
      traineeId: String(row.traineeId),
      type: 'photos_uploaded',
      source: 'progress',
      date: row.date,
      logId: null,
      count: photos.length,
      photos: signedPhotos(photos),
    };
  });
  return sourcePage(events, rows.length, rows.at(-1)?.photoAt ?? null, limit);
}

/** The biggest move against her previous entry (weight or one measurement), for the item's one delta. */
function notableChange(current: BodyRow, previous: BodyRow | undefined): { id: string; delta: number } | null {
  if (!previous) return null;
  const changes: { id: string; delta: number }[] = [];
  if (current.weight !== undefined && previous.weight !== undefined) changes.push({ id: 'weight', delta: current.weight - previous.weight });
  for (const [id, value] of Object.entries(current.measurements ?? {})) {
    const before = previous.measurements?.[id];
    if (before !== undefined) changes.push({ id, delta: value - before });
  }
  const moved = changes.filter((change) => Math.abs(change.delta) >= 0.05);
  if (moved.length === 0) return null;
  const biggest = moved.reduce((top, change) => (Math.abs(change.delta) > Math.abs(top.delta) ? change : top));
  return { id: biggest.id, delta: Math.round(biggest.delta * 10) / 10 };
}

/** Weight / measurements: one item per day at its last change — unless that change was only a photo. */
async function measurementEvents(scope: Scope, before: Date, limit: number): Promise<SourcePage> {
  const rows = await BodyMetric.aggregate<BodyRow>([
    {
      $match: {
        traineeId: { $in: scope.traineeIds },
        updatedAt: { $lt: before },
        $and: [{ $or: [{ weight: { $exists: true } }, { measurements: { $exists: true } }] }, { $or: sinceJoined(scope, 'updatedAt') }],
      },
    },
    { $addFields: { photoAt: { $max: { $concatArrays: ['$photos.uploadedAt', { $ifNull: [['$startingPhoto.uploadedAt'], []] }] } } } },
    { $sort: { updatedAt: -1 } },
    { $limit: limit },
  ]);
  const changed = rows.filter((row) => !row.photoAt || Math.abs(row.updatedAt.getTime() - row.photoAt.getTime()) > PHOTO_ONLY_CHANGE_MS);
  const previous = await Promise.all(
    changed.map((row) =>
      BodyMetric.findOne({
        traineeId: row.traineeId,
        date: { $lt: row.date },
        $or: [{ weight: { $exists: true } }, { measurements: { $exists: true } }],
      })
        .sort({ date: -1 })
        .lean<BodyRow>(),
    ),
  );
  const events: Event[] = changed.map((row, index) => ({
    id: `measurements_updated:${row._id}`,
    at: row.updatedAt.toISOString(),
    traineeId: String(row.traineeId),
    type: 'measurements_updated',
    date: row.date,
    weightKg: row.weight ?? null,
    change: notableChange({ ...row, measurements: toPlain(row.measurements) }, previous[index] ? { ...previous[index]!, measurements: toPlain(previous[index]!.measurements) } : undefined),
  }));
  return sourcePage(events, rows.length, rows.at(-1)?.updatedAt ?? null, limit);
}

/** A Map stored by Mongoose reads back as a plain object from aggregate, but as a Map-like from lean(). */
function toPlain(value: unknown): Record<string, number> | undefined {
  if (!value) return undefined;
  return value instanceof Map ? Object.fromEntries(value) : (value as Record<string, number>);
}

function joinEvents(coachings: { _id: Types.ObjectId; traineeId: Types.ObjectId; startedAt: Date }[], statuses: Map<string, OnboardingStatus>, before: Date): Event[] {
  return coachings
    .filter((coaching) => coaching.startedAt < before)
    .map((coaching) => ({
      id: `trainee_joined:${coaching._id}`,
      at: coaching.startedAt.toISOString(),
      traineeId: String(coaching.traineeId),
      type: 'trainee_joined',
      onboardingStatus: statuses.get(String(coaching.traineeId)) ?? 'not_started',
    }));
}

export async function getCoachActivity(coachId: string, before: Date, limit: number, now: Date = new Date()): Promise<CoachActivityPage> {
  const coachings = await listCoachCoachings(coachId);
  if (coachings.length === 0) return { items: [], nextBefore: null, serverTime: now.toISOString() };

  const scope: Scope = {
    coachingIds: coachings.map((coaching) => coaching._id),
    traineeIds: coachings.map((coaching) => coaching.traineeId),
    joins: coachings.map((coaching) => ({ traineeId: coaching.traineeId, startedAt: coaching.startedAt })),
  };
  const users = await User.find({ _id: { $in: scope.traineeIds } })
    .select('name avatar onboardingStatus')
    .lean<{ _id: Types.ObjectId; name: string; avatar?: { publicId: string; uploadedAt: Date } | null; onboardingStatus: OnboardingStatus }[]>();
  const statuses = new Map(users.map((user) => [String(user._id), user.onboardingStatus]));

  const sources = await Promise.all([
    workoutEvents(scope, before, limit),
    pumpEvents(scope, before, limit),
    cardioEvents(scope, before, limit),
    mealPhotoEvents(scope, before, limit),
    progressPhotoEvents(scope, before, limit),
    measurementEvents(scope, before, limit),
  ]);
  // The joins are few (one per live coaching) and always complete.
  const joins = joinEvents(coachings, statuses, before);
  // A source that hit the limit may hold more rows below its oldest one: the page stops there.
  const floor = sources.filter((source) => source.full && source.oldest).reduce<string | null>(
    (highest, source) => (highest === null || source.oldest! > highest ? source.oldest! : highest),
    null,
  );
  const merged = [...sources.flatMap((source) => source.events), ...joins]
    .filter((event) => floor === null || event.at >= floor)
    .sort((a, b) => b.at.localeCompare(a.at));
  const page = merged.slice(0, limit);
  const hasMore = merged.length > limit || sources.some((source) => source.full);

  const trainees = new Map<string, CoachActivityTrainee>(
    users.map((user) => [String(user._id), { id: String(user._id), name: user.name, avatar: toPublicAvatar(user.avatar) }]),
  );
  const items = page.flatMap(({ traineeId, ...event }) => {
    const trainee = trainees.get(traineeId);
    return trainee ? [{ ...event, trainee } as CoachActivityItem] : [];
  });
  return {
    items,
    // An empty page (a source's rows were all filtered out) still moves on, from that source's floor.
    nextBefore: hasMore ? (page.at(-1)?.at ?? floor) : null,
    serverTime: now.toISOString(),
  };
}
