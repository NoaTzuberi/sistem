import { Types } from 'mongoose';
import type { CoachMealLogWeek, Language, MealLogDay, MealLogDaysResponse, MealPhoto, PortionCounts } from '@sistem/types';
import { User } from '../users/user.model';
import { DEFAULT_TIMEZONE } from '../users/users.constants';
import { resolveLanguage } from '../users/units';
import { addDays, daysBetween, localDateString, weekStartOf } from '../plans/planWeek';
import { NutritionPlanVersion } from '../nutrition/nutritionPlan.model';
import { PORTION_GROUP_IDS, PORTION_STEP } from '../nutrition/nutrition.constants';
import type { NutritionPlanVersionDocument } from '../nutrition/nutrition.types';
import { toPortionCounts } from '../nutrition/nutritionMapping';
import { MEAL_PHOTO_FOLDER } from '../privatePhotos/privatePhoto.constants';
import { deletePrivatePhoto, toPublicPhoto, uploadPrivatePhoto } from '../privatePhotos/privatePhoto.service';
import { isAcceptedImage } from '../privatePhotos/privatePhoto.validation';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { loadOwnTarget, toPublicOwnTarget } from '../ownNutrition/ownNutritionTarget.service';
import type { LeanOwnTarget } from '../ownNutrition/ownNutritionTarget.service';
import { MealLog } from './mealLog.model';
import { DEFAULT_MEAL_COUNT, DEFAULT_MEAL_IDS_BY_COUNT, MAX_MEAL_PHOTOS_PER_DAY, MEAL_LOG_EDITABLE_DAYS } from './mealLog.constants';
import type { MealLogDocument, MealPhotoFields } from './mealLog.types';
import { LocalizedError, translate } from '../../i18n';
import type { MessageCode } from '../../i18n';
import { dayPortionsOf } from '../nutrition/nutritionPlanMode';
import { getCurrentCoaching } from '../coachings/coaching.service';

// Portion tracking (PRD §5.6, Phase 13a+): one MealLog per trainee and day. She marks
// portions per group against the day's plan — never what she ate, never calories — and
// may add private photos per meal. Today follows the newest published version; a past
// day keeps the version it was logged against (or, if never logged, the one live then).
// Without a coach's plan, the day is tracked against her own target ("היעד שלי", trainee-owned).

export class MealLogDayError extends LocalizedError {}
export class MealLogNoPlanError extends LocalizedError {}
export class InvalidMealPhotoError extends LocalizedError {}
export class MealPhotoNotFoundError extends LocalizedError {}

type LeanVersion = Pick<NutritionPlanVersionDocument, 'planId' | 'coachId' | 'coachingId' | 'version' | 'publishedAt' | 'meals'> & {
  _id: Types.ObjectId;
};
type LeanMealLog = MealLogDocument & { _id: Types.ObjectId };
type Meal = { id: string; name: string };

const ZERO: PortionCounts = { protein: 0, carb: 0, fat: 0, snack: 0 };

/** What a day is tracked against: a coach's plan version or her own target. */
interface DayBasis {
  source: 'plan' | 'own';
  planned: PortionCounts;
  meals: Meal[];
  planVersion: number | null;
  /** Written on the log (upsert). */
  ref: { source: 'plan' | 'own'; planId: Types.ObjectId | null; planVersion: number | null; coachId: Types.ObjectId | null; coachingId: Types.ObjectId | null };
}

interface TraineeFacts {
  timezone: string;
  defaultMeals: Meal[];
}

async function traineeFacts(traineeId: string): Promise<TraineeFacts> {
  const [user, response] = await Promise.all([
    User.findById(traineeId).select('timezone preferences').lean(),
    OnboardingResponse.findOne({ userId: traineeId }).select('answers.nutritionPreferences.mealsPerDay').lean(),
  ]);
  return {
    timezone: user?.timezone ?? DEFAULT_TIMEZONE,
    defaultMeals: defaultMeals(response?.answers?.nutritionPreferences?.mealsPerDay ?? null, resolveLanguage(user?.preferences)),
  };
}

/** Her "meals per day" answer (else 4) as stable ids + names in her language. */
function defaultMeals(mealsPerDay: number | null, language: Language): Meal[] {
  const ids = DEFAULT_MEAL_IDS_BY_COUNT[mealsPerDay ?? DEFAULT_MEAL_COUNT] ?? DEFAULT_MEAL_IDS_BY_COUNT[DEFAULT_MEAL_COUNT];
  return ids.map((id) => ({ id, name: translate(language, `meal_${id}` as MessageCode) }));
}

/**
 * The versions of ONE coaching, newest first (a trainee has a handful): the coach's own (coach view),
 * else her current coaching's (her app). No coaching → none.
 */
async function loadVersions(traineeId: string, coachingId: string | null = null): Promise<LeanVersion[]> {
  const scope = coachingId ?? (await getCurrentCoaching(traineeId))?._id ?? null;
  if (!scope) return [];
  return NutritionPlanVersion.find({ traineeId, coachingId: scope })
    .sort({ version: -1 })
    .select('planId coachId coachingId version publishedAt meals mode dailyPortions')
    .lean<LeanVersion[]>();
}

/** The version live on `date` (her zone): the newest one published that day or before. */
function versionLiveOn(versions: readonly LeanVersion[], date: string, timezone: string): LeanVersion | null {
  return versions.find((version) => localDateString(version.publishedAt, timezone) <= date) ?? null;
}

function basisOfVersion(version: LeanVersion, facts: TraineeFacts): DayBasis {
  const meals = version.meals.map((meal) => ({ id: String(meal._id), name: meal.name }));
  return {
    source: 'plan',
    // Its daily portions (portions mode) or its meals summed (menu mode).
    planned: dayPortionsOf(version),
    // A portions-only plan may have no meals: photos then use the default meals.
    meals: meals.length > 0 ? meals : facts.defaultMeals,
    planVersion: version.version,
    ref: { source: 'plan', planId: version.planId, planVersion: version.version, coachId: version.coachId, coachingId: version.coachingId },
  };
}

function basisOfOwn(target: LeanOwnTarget | null, facts: TraineeFacts): DayBasis {
  return {
    source: 'own',
    planned: target ? toPortionCounts(target.portions) : { ...ZERO },
    meals: facts.defaultMeals,
    planVersion: null,
    ref: { source: 'own', planId: null, planVersion: null, coachId: null, coachingId: null },
  };
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

function photoId(photo: MealPhotoFields): string {
  // Photos from before several-per-meal have no _id: their meal id stands in (one per meal then).
  return photo._id ? String(photo._id) : String(photo.mealId);
}

function toPublicMealPhoto(photo: MealPhotoFields): MealPhoto {
  return { id: photoId(photo), mealId: String(photo.mealId), mealName: photo.mealName, ...toPublicPhoto(photo) };
}

/**
 * The basis a day is shown and saved against: today → the newest coach version, else her own target;
 * a logged past day → what it was logged with; otherwise the version live that day, else her target.
 */
function basisForDay(
  date: string,
  today: string,
  log: LeanMealLog | null,
  versions: readonly LeanVersion[],
  own: LeanOwnTarget | null,
  facts: TraineeFacts,
): DayBasis | null {
  const ownBasis = own ? basisOfOwn(own, facts) : null;
  if (date === today) return versions[0] ? basisOfVersion(versions[0], facts) : ownBasis;
  if (log) {
    if (log.source === 'own') return basisOfOwn(own, facts);
    const match = versions.find((version) => version.version === log.planVersion && String(version.planId) === String(log.planId));
    return match ? basisOfVersion(match, facts) : null;
  }
  const live = versionLiveOn(versions, date, facts.timezone);
  return live ? basisOfVersion(live, facts) : ownBasis;
}

function toDay(date: string, today: string, log: LeanMealLog | null, basis: DayBasis | null): MealLogDay {
  // Today follows the newest basis; a past log keeps its own snapshot.
  const planned = date === today && basis ? basis.planned : log ? toPortionCounts(log.planned) : basis ? basis.planned : { ...ZERO };
  return {
    date,
    planned,
    eaten: log ? clampEaten(toPortionCounts(log.eaten), planned) : { ...ZERO },
    photos: (log?.photos ?? []).map(toPublicMealPhoto),
    planVersion: date === today ? (basis?.planVersion ?? null) : (log?.planVersion ?? basis?.planVersion ?? null),
    editable: isEditable(date, today),
    logged: log !== null,
    meals: basis?.meals ?? [],
    source: log?.source ?? basis?.source ?? null,
  };
}

async function buildDays(
  traineeId: string,
  dates: string[],
  today: string,
  facts: TraineeFacts,
  coachingId: string | null = null,
): Promise<{ days: MealLogDay[]; versions: LeanVersion[]; own: LeanOwnTarget | null }> {
  // The coach sees the days tracked against HER plan, plus the days the trainee tracked against
  // her own target (trainee-owned history).
  const logFilter: Record<string, unknown> = { traineeId, date: { $in: dates } };
  if (coachingId) logFilter.$or = [{ coachingId }, { source: 'own' }];
  const [versions, logs, own] = await Promise.all([
    loadVersions(traineeId, coachingId),
    MealLog.find(logFilter).lean<LeanMealLog[]>(),
    loadOwnTarget(traineeId),
  ]);
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const days = dates.map((date) => {
    const log = byDate.get(date) ?? null;
    // The coach's view never applies the trainee's own target to a day she didn't track.
    const basis = basisForDay(date, today, log, versions, coachingId && log?.source !== 'own' ? null : own, facts);
    return toDay(date, today, log, basis);
  });
  return { days, versions, own };
}

/** Her editable window (today and the 6 days before), oldest first, plus her own target. */
export async function getMyMealLogDays(traineeId: string, now: Date = new Date()): Promise<MealLogDaysResponse> {
  const facts = await traineeFacts(traineeId);
  const today = localDateString(now, facts.timezone);
  const dates = Array.from({ length: MEAL_LOG_EDITABLE_DAYS }, (_, index) => addDays(today, index - (MEAL_LOG_EDITABLE_DAYS - 1)));
  const { days, versions, own } = await buildDays(traineeId, dates, today, facts);
  return { today, days, ownTarget: toPublicOwnTarget(own), hasCoachPlan: versions.length > 0 };
}

interface DayContext {
  today: string;
  basis: DayBasis;
  log: LeanMealLog | null;
}

/** Refuses a day outside her window or without a plan / target. */
async function loadEditableDay(traineeId: string, date: string, now: Date): Promise<DayContext> {
  const facts = await traineeFacts(traineeId);
  const today = localDateString(now, facts.timezone);
  if (!isEditable(date, today)) {
    throw new MealLogDayError('meal_log_day_out_of_window', { days: MEAL_LOG_EDITABLE_DAYS - 1 });
  }
  const [versions, log, own] = await Promise.all([
    loadVersions(traineeId),
    MealLog.findOne({ traineeId, date }).lean<LeanMealLog>(),
    loadOwnTarget(traineeId),
  ]);
  const basis = basisForDay(date, today, log, versions, own, facts);
  if (!basis) throw new MealLogNoPlanError('meal_log_no_plan');
  return { today, basis, log };
}

async function dayResponse(traineeId: string, date: string, context: DayContext): Promise<MealLogDay> {
  const log = await MealLog.findOne({ traineeId, date }).lean<LeanMealLog>();
  return toDay(date, context.today, log, context.basis);
}

/** Today is saved against the newest basis; a past day keeps its snapshot. */
function plannedToSave(date: string, context: DayContext): PortionCounts {
  return date === context.today || !context.log ? context.basis.planned : toPortionCounts(context.log.planned);
}

/** PUT /meal-logs/:date — the whole day's marks, last write wins (the phone sends its full state). */
export async function saveMyMealLog(traineeId: string, date: string, eaten: PortionCounts, now: Date = new Date()): Promise<MealLogDay> {
  const context = await loadEditableDay(traineeId, date, now);
  const { basis, log } = context;
  const planned = plannedToSave(date, context);
  const marks = clampEaten(eaten, planned);
  const empty = PORTION_GROUP_IDS.every((group) => marks[group] === 0);

  if (empty && (log?.photos.length ?? 0) === 0) {
    // Nothing left to keep: an un-marked day is no log at all.
    await MealLog.deleteOne({ traineeId, date, photos: { $size: 0 } });
  } else {
    // The day follows what it is tracked against now (her own target → a coach's plan once one is live).
    await MealLog.updateOne(
      { traineeId, date },
      { $set: { ...basis.ref, planned, eaten: marks }, $setOnInsert: { photos: [] } },
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

/** Adds one photo to a meal on one day (a meal can hold several; the day is capped). */
export async function addMyMealPhoto(
  traineeId: string,
  date: string,
  mealId: string,
  data: Buffer,
  now: Date = new Date(),
): Promise<MealLogDay> {
  const context = await loadEditableDay(traineeId, date, now);
  const meal = context.basis.meals.find((candidate) => candidate.id === mealId);
  if (!meal) throw new InvalidMealPhotoError('meal_log_meal_unknown');
  if ((context.log?.photos.length ?? 0) >= MAX_MEAL_PHOTOS_PER_DAY) {
    throw new InvalidMealPhotoError('meal_log_photos_full', { max: MAX_MEAL_PHOTOS_PER_DAY });
  }
  if (!isAcceptedImage(data)) throw new InvalidMealPhotoError('photo_invalid_image');

  const id = new Types.ObjectId();
  const publicId = await uploadPrivatePhoto(data, `${MEAL_PHOTO_FOLDER}/${traineeId}`, `${date}-${String(id)}`);
  // A plan meal keeps its ObjectId; a default meal its string id.
  const storedMealId = Types.ObjectId.isValid(meal.id) && meal.id.length === 24 ? new Types.ObjectId(meal.id) : meal.id;
  const photo: MealPhotoFields = { _id: id, mealId: storedMealId, mealName: meal.name, publicId, uploadedAt: now };
  try {
    await MealLog.updateOne(
      { traineeId, date },
      { $setOnInsert: { ...context.basis.ref, planned: plannedToSave(date, context), eaten: { ...ZERO } } },
      { upsert: true },
    );
    const result = await MealLog.updateOne(
      { traineeId, date, [`photos.${MAX_MEAL_PHOTOS_PER_DAY - 1}`]: { $exists: false } },
      { $push: { photos: photo } },
    );
    if (result.matchedCount === 0) throw new InvalidMealPhotoError('meal_log_photos_full', { max: MAX_MEAL_PHOTOS_PER_DAY });
  } catch (error) {
    await deleteQuietly(publicId);
    throw error;
  }
  return dayResponse(traineeId, date, context);
}

/** Removes one photo by its id (an old photo without an id: by its meal id). */
export async function removeMyMealPhoto(traineeId: string, date: string, id: string, now: Date = new Date()): Promise<MealLogDay> {
  const context = await loadEditableDay(traineeId, date, now);
  const removed = context.log?.photos.find((photo) => photoId(photo) === id);
  if (!removed) throw new MealPhotoNotFoundError('meal_photo_not_found');
  const pull = removed._id ? { _id: removed._id } : { mealId: removed.mealId, publicId: removed.publicId };
  await MealLog.updateOne({ traineeId, date }, { $pull: { photos: pull } });
  await deleteQuietly(removed.publicId);
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
export async function getCoachMealLogWeek(traineeId: string, coachingId: string, requestedWeek: string | null, now: Date = new Date()): Promise<CoachMealLogWeek> {
  const facts = await traineeFacts(traineeId);
  const today = localDateString(now, facts.timezone);
  const weekStart = requestedWeek ?? weekStartOf(today);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const { days } = await buildDays(traineeId, dates, today, facts, coachingId);
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
