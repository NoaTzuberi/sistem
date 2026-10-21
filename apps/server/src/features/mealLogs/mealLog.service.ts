import type { Types } from 'mongoose';
import type { CoachMealLogWeek, MealLogDay, MealLogDaysResponse, MealPhoto, PortionCounts } from '@sistem/types';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { addDays, daysBetween, localDateString, weekStartOf } from '../plans/planWeek';
import { NutritionPlanVersion } from '../nutrition/nutritionPlan.model';
import { PORTION_GROUP_IDS, PORTION_STEP } from '../nutrition/nutrition.constants';
import type { NutritionPlanVersionDocument } from '../nutrition/nutrition.types';
import { toPortionCounts } from '../nutrition/nutritionMapping';
import { MEAL_PHOTO_FOLDER } from '../privatePhotos/privatePhoto.constants';
import { deletePrivatePhoto, toPublicPhoto, uploadPrivatePhoto } from '../privatePhotos/privatePhoto.service';
import { isAcceptedImage } from '../privatePhotos/privatePhoto.validation';
import { MealLog } from './mealLog.model';
import { MEAL_LOG_EDITABLE_DAYS } from './mealLog.constants';
import type { MealLogDocument, MealPhotoFields } from './mealLog.types';
import { LocalizedError } from '../../i18n';
import { dayPortionsOf } from '../nutrition/nutritionPlanMode';

// Portion tracking (PRD §5.6, Phase 13a+): one MealLog per trainee and day. She marks
// portions per group against the day's plan — never what she ate, never calories — and
// may add a private photo per meal. Today follows the newest published version; a past
// day keeps the version it was logged against (or, if never logged, the one live then).

export class MealLogDayError extends LocalizedError {}
export class MealLogNoPlanError extends LocalizedError {}
export class InvalidMealPhotoError extends LocalizedError {}

type LeanVersion = Pick<NutritionPlanVersionDocument, 'planId' | 'coachId' | 'version' | 'publishedAt' | 'meals'> & {
  _id: Types.ObjectId;
};
type LeanMealLog = MealLogDocument & { _id: Types.ObjectId };

const ZERO: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };

async function traineeTimezone(traineeId: string): Promise<string> {
  const user = await User.findById(traineeId).select('timezone').lean();
  return user?.timezone ?? DEFAULT_TIMEZONE;
}

/** Her versions, newest first (a trainee has a handful). */
async function loadVersions(traineeId: string): Promise<LeanVersion[]> {
  return NutritionPlanVersion.find({ traineeId })
    .sort({ version: -1 })
    .select('planId coachId version publishedAt meals mode dailyPortions')
    .lean<LeanVersion[]>();
}

/** The version live on `date` (her zone): the newest one published that day or before. */
function versionLiveOn(versions: readonly LeanVersion[], date: string, timezone: string): LeanVersion | null {
  return versions.find((version) => localDateString(version.publishedAt, timezone) <= date) ?? null;
}

/** The day's portions of that version: its daily portions (portions mode) or its meals summed (menu mode). */
function plannedOf(version: LeanVersion): PortionCounts {
  return dayPortionsOf(version);
}

/** Never more than planned, in steps of 0.5 (a plan that shrank since the tap clamps it). */
function clampEaten(eaten: PortionCounts, planned: PortionCounts): PortionCounts {
  const clamped = { ...ZERO };
  for (const group of PORTION_GROUP_IDS) {
    clamped[group] = Math.min(planned[group], Math.max(0, Math.floor(eaten[group] / PORTION_STEP) * PORTION_STEP));
  }
  return clamped;
}

function isEditable(date: string, today: string): boolean {
  const age = daysBetween(date, today);
  return age >= 0 && age < MEAL_LOG_EDITABLE_DAYS;
}

function toPublicMealPhoto(photo: MealPhotoFields): MealPhoto {
  return { mealId: String(photo.mealId), mealName: photo.mealName, ...toPublicPhoto(photo) };
}

/**
 * The version a day is shown and saved against: today → the newest; a logged past day →
 * the one it was logged with; otherwise the one live that day.
 */
function versionForDay(
  date: string,
  today: string,
  log: LeanMealLog | null,
  versions: readonly LeanVersion[],
  timezone: string,
): LeanVersion | null {
  if (date === today) return versions[0] ?? null;
  if (log) return versions.find((version) => version.version === log.planVersion && String(version.planId) === String(log.planId)) ?? null;
  return versionLiveOn(versions, date, timezone);
}

function toDay(date: string, today: string, log: LeanMealLog | null, version: LeanVersion | null): MealLogDay {
  // Today follows the newest version; a past log keeps its own snapshot.
  const planned = date === today && version ? plannedOf(version) : log ? toPortionCounts(log.planned) : version ? plannedOf(version) : { ...ZERO };
  return {
    date,
    planned,
    eaten: log ? clampEaten(toPortionCounts(log.eaten), planned) : { ...ZERO },
    photos: (log?.photos ?? []).map(toPublicMealPhoto),
    planVersion: date === today ? (version?.version ?? null) : (log?.planVersion ?? version?.version ?? null),
    editable: isEditable(date, today),
    logged: log !== null,
    meals: (version?.meals ?? []).map((meal) => ({ id: String(meal._id), name: meal.name })),
  };
}

async function buildDays(traineeId: string, dates: string[], today: string, timezone: string): Promise<MealLogDay[]> {
  const [versions, logs] = await Promise.all([
    loadVersions(traineeId),
    MealLog.find({ traineeId, date: { $in: dates } }).lean<LeanMealLog[]>(),
  ]);
  const byDate = new Map(logs.map((log) => [log.date, log]));
  return dates.map((date) => {
    const log = byDate.get(date) ?? null;
    return toDay(date, today, log, versionForDay(date, today, log, versions, timezone));
  });
}

/** Her editable window (today and the 6 days before), oldest first. */
export async function getMyMealLogDays(traineeId: string, now: Date = new Date()): Promise<MealLogDaysResponse> {
  const timezone = await traineeTimezone(traineeId);
  const today = localDateString(now, timezone);
  const dates = Array.from({ length: MEAL_LOG_EDITABLE_DAYS }, (_, index) => addDays(today, index - (MEAL_LOG_EDITABLE_DAYS - 1)));
  return { today, days: await buildDays(traineeId, dates, today, timezone) };
}

interface DayContext {
  today: string;
  timezone: string;
  version: LeanVersion;
  log: LeanMealLog | null;
}

/** Refuses a day outside her window or without a live plan. */
async function loadEditableDay(traineeId: string, date: string, now: Date): Promise<DayContext> {
  const timezone = await traineeTimezone(traineeId);
  const today = localDateString(now, timezone);
  if (!isEditable(date, today)) {
    throw new MealLogDayError('meal_log_day_out_of_window', { days: MEAL_LOG_EDITABLE_DAYS - 1 });
  }
  const [versions, log] = await Promise.all([loadVersions(traineeId), MealLog.findOne({ traineeId, date }).lean<LeanMealLog>()]);
  const version = versionForDay(date, today, log, versions, timezone);
  if (!version) throw new MealLogNoPlanError('meal_log_no_plan');
  return { today, timezone, version, log };
}

async function dayResponse(traineeId: string, date: string, context: DayContext): Promise<MealLogDay> {
  const log = await MealLog.findOne({ traineeId, date }).lean<LeanMealLog>();
  return toDay(date, context.today, log, context.version);
}

/** PUT /meal-logs/:date — the whole day's marks, last write wins (the phone sends its full state). */
export async function saveMyMealLog(traineeId: string, date: string, eaten: PortionCounts, now: Date = new Date()): Promise<MealLogDay> {
  const context = await loadEditableDay(traineeId, date, now);
  const { version, log } = context;
  // Today is saved against the newest version; a past day keeps its snapshot.
  const planned = date === context.today || !log ? plannedOf(version) : toPortionCounts(log.planned);
  const marks = clampEaten(eaten, planned);
  const empty = PORTION_GROUP_IDS.every((group) => marks[group] === 0);

  if (empty && (log?.photos.length ?? 0) === 0) {
    // Nothing left to keep: an un-marked day is no log at all.
    await MealLog.deleteOne({ traineeId, date, photos: { $size: 0 } });
  } else {
    await MealLog.updateOne(
      { traineeId, date },
      {
        $set: { planId: version.planId, planVersion: version.version, planned, eaten: marks },
        $setOnInsert: { coachId: version.coachId, photos: [] },
      },
      { upsert: true },
    );
  }
  return dayResponse(traineeId, date, context);
}

async function deleteQuietly(publicId: string): Promise<void> {
  try {
    await deletePrivatePhoto(publicId);
  } catch (error) {
    console.error(`[privatePhotos] could not delete ${publicId}`, error);
  }
}

/** Uploads (or replaces) the photo of one meal on one day. */
export async function setMyMealPhoto(
  traineeId: string,
  date: string,
  mealId: string,
  data: Buffer,
  now: Date = new Date(),
): Promise<MealLogDay> {
  const context = await loadEditableDay(traineeId, date, now);
  const meal = context.version.meals.find((candidate) => String(candidate._id) === mealId);
  if (!meal) throw new InvalidMealPhotoError('meal_log_meal_unknown');
  if (!isAcceptedImage(data)) throw new InvalidMealPhotoError('photo_invalid_image');

  const publicId = await uploadPrivatePhoto(data, `${MEAL_PHOTO_FOLDER}/${traineeId}`, `${date}-${mealId}`);
  const photo: MealPhotoFields = { mealId: meal._id, mealName: meal.name, publicId, uploadedAt: now };
  let replaced: MealPhotoFields | undefined;
  try {
    const { version } = context;
    const planned = date === context.today || !context.log ? plannedOf(version) : toPortionCounts(context.log.planned);
    await MealLog.updateOne(
      { traineeId, date },
      {
        $setOnInsert: { coachId: version.coachId, planId: version.planId, planVersion: version.version, planned, eaten: { ...ZERO } },
      },
      { upsert: true },
    );
    const before = await MealLog.findOneAndUpdate(
      { traineeId, date },
      { $pull: { photos: { mealId: meal._id } } },
      { returnDocument: 'before' },
    ).lean<LeanMealLog>();
    replaced = before?.photos.find((old) => String(old.mealId) === mealId);
    await MealLog.updateOne({ traineeId, date }, { $push: { photos: photo } });
  } catch (error) {
    await deleteQuietly(publicId);
    throw error;
  }
  if (replaced) await deleteQuietly(replaced.publicId);
  return dayResponse(traineeId, date, context);
}

export async function removeMyMealPhoto(traineeId: string, date: string, mealId: string, now: Date = new Date()): Promise<MealLogDay> {
  const context = await loadEditableDay(traineeId, date, now);
  const before = await MealLog.findOneAndUpdate(
    { traineeId, date },
    { $pull: { photos: { mealId } } },
    { returnDocument: 'before' },
  ).lean<LeanMealLog>();
  const removed = before?.photos.find((photo) => String(photo.mealId) === mealId);
  if (removed) await deleteQuietly(removed.publicId);
  // A day with no marks and no photos left is no log at all.
  await MealLog.deleteOne({
    traineeId,
    date,
    photos: { $size: 0 },
    'eaten.protein': 0,
    'eaten.carb': 0,
    'eaten.fat': 0,
    // Logs from before snacks (13a+) have no snack field: null matches a missing one.
    'eaten.snack': { $in: [0, null] },
  });
  return dayResponse(traineeId, date, context);
}

/** The coach's read-only week (Sunday → Saturday; null = her current week) — marked vs planned, photos. */
export async function getCoachMealLogWeek(traineeId: string, requestedWeek: string | null, now: Date = new Date()): Promise<CoachMealLogWeek> {
  const timezone = await traineeTimezone(traineeId);
  const today = localDateString(now, timezone);
  const weekStart = requestedWeek ?? weekStartOf(today);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const days = await buildDays(traineeId, dates, today, timezone);
  const totals = { planned: { ...ZERO }, eaten: { ...ZERO } };
  // Days still to come count for neither side.
  for (const day of days) {
    if (day.date > today) continue;
    for (const group of PORTION_GROUP_IDS) {
      totals.planned[group] += day.planned[group];
      totals.eaten[group] += day.eaten[group];
    }
  }
  return { weekStart, today, days, totals };
}
