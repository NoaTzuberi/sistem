import bcrypt from 'bcrypt';
import type { Types } from 'mongoose';
import { User, hasRole } from '../users/user.model';
import { OnboardingResponse } from '../onboarding/onboardingResponse.model';
import { Coaching } from '../coachings/coaching.model';
import { CoachProfile } from '../coachProfiles/coachProfile.model';
import { Community, Membership } from '../communities/community.model';
import { Invite } from '../invites/invite.model';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { PersonalRecord } from '../personalRecords/personalRecord.model';
import { Achievement } from '../achievements/achievement.model';
import { BodyMetric } from '../bodyMetrics/bodyMetric.model';
import { MealLog } from '../mealLogs/mealLog.model';
import { CardioLog } from '../cardio/cardio.model';
import { OwnCardioWorkout } from '../cardio/ownCardio.model';
import { OwnNutritionTarget } from '../ownNutrition/ownNutritionTarget.model';
import { Recipe, WaterLog } from '../nutrition/nutritionLogs.model';
import { NutritionPlan, NutritionPlanVersion } from '../nutrition/nutritionPlan.model';
import { NutritionSettings } from '../nutrition/nutritionSettings.model';
import { FoodItem } from '../nutrition/foodItem.model';
import { Plan } from '../plans/plan.model';
import { Template } from '../templates/template.model';
import { TrainingSettings } from '../trainingSplits/trainingSettings.model';
import { AiRecommendation } from '../aiRecommendations/aiRecommendation.model';
import { Message } from '../messages/message.model';
import { Reaction } from '../reactions/reaction.model';
import { Notification } from '../notifications/notification.model';
import {
  deletePrivatePhoto,
  deletePrivatePhotosByPrefix,
  isPhotoStorageConfigured,
} from '../privatePhotos/privatePhoto.service';
import { AVATAR_PHOTO_FOLDER, MEAL_PHOTO_FOLDER, PROGRESS_PHOTO_FOLDER, PUMP_PHOTO_FOLDER } from '../privatePhotos/privatePhoto.constants';
import { LocalizedError } from '../../i18n';
import { ACCOUNT_DELETE_CONFIRM_WORDS } from './account.constants';

// Deleting her own account (App Store requirement, PRD §14 privacy). Order matters:
//   1. checks (password, admin, a coach's live trainees) — nothing is touched before they pass;
//   2. her photos are removed from storage and the folders checked empty — if that fails NOTHING else
//      is deleted, so she can try again and no photo is ever left without a record pointing at it;
//   3. her coachings end, then her data is deleted; the user document goes LAST, which also kills
//      every token (requireAuth finds no user). Re-running after a failure in 3 finishes the job.
// Kept on purpose: the ended Coaching rows (the coach's history: dates only) and the system food bank.

export class AccountPasswordWrongError extends LocalizedError {}
export class AccountConfirmRequiredError extends LocalizedError {}
export class AdminAccountDeletionError extends LocalizedError {}
export class CoachHasTraineesError extends LocalizedError {}
export class PhotoCleanupFailedError extends LocalizedError {}

type Id = string | Types.ObjectId;

const PHOTO_FOLDERS = [PUMP_PHOTO_FOLDER, PROGRESS_PHOTO_FOLDER, MEAL_PHOTO_FOLDER, AVATAR_PHOTO_FOLDER];

/** Every photo id the database knows for her (Daily Pump, progress + starting, meals, profile). */
async function listPhotoIds(userId: Id): Promise<string[]> {
  const [user, pumps, bodies, meals] = await Promise.all([
    User.findById(userId).select('avatar').lean(),
    WorkoutLog.find({ traineeId: userId, pumpPhoto: { $ne: null } }).select('pumpPhoto').lean(),
    BodyMetric.find({ traineeId: userId }).select('photos startingPhoto').lean(),
    MealLog.find({ traineeId: userId, 'photos.0': { $exists: true } }).select('photos').lean(),
  ]);
  const ids = [
    user?.avatar?.publicId,
    ...pumps.map((log) => log.pumpPhoto?.publicId),
    ...bodies.flatMap((day) => [...(day.photos ?? []).map((photo) => photo.publicId), day.startingPhoto?.publicId]),
    ...meals.flatMap((day) => (day.photos ?? []).map((photo) => photo.publicId)),
  ];
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/**
 * Removes her photos from Cloudinary: each known id, then her four folders by prefix (catches any
 * the database lost), then checks each folder is really empty. Throws when anything is left.
 */
async function deleteStoredPhotos(userId: Id): Promise<void> {
  const ids = await listPhotoIds(userId);
  // No storage configured (dev without Cloudinary): nothing can have been uploaded.
  if (!isPhotoStorageConfigured()) {
    if (ids.length > 0) throw new PhotoCleanupFailedError('account_photo_cleanup_failed');
    return;
  }
  try {
    for (const id of ids) await deletePrivatePhoto(id);
    let left = 0;
    for (const folder of PHOTO_FOLDERS) left += await deletePrivatePhotosByPrefix(`${folder}/${String(userId)}/`);
    if (left > 0) throw new Error(`${left} photos still stored`);
  } catch (error) {
    console.error('Account deletion: photo cleanup failed.', error instanceof Error ? error.message : error);
    throw new PhotoCleanupFailedError('account_photo_cleanup_failed');
  }
}

/** Her answer to the confirm step: the password when the account has one, else the confirm word. */
async function checkConfirmation(passwordHash: string | null | undefined, password: string | undefined, confirmWord: string | undefined): Promise<void> {
  if (passwordHash) {
    if (!password) throw new AccountConfirmRequiredError('account_confirm_required');
    if (!(await bcrypt.compare(password, passwordHash))) throw new AccountPasswordWrongError('account_password_wrong');
    return;
  }
  if (!confirmWord || !ACCOUNT_DELETE_CONFIRM_WORDS.includes(confirmWord.trim())) {
    throw new AccountConfirmRequiredError('account_confirm_required');
  }
}

/** Everything she owns as a trainee, and the coach-owned records written about her. */
async function deleteTraineeData(userId: Id): Promise<void> {
  const traineeId = String(userId);
  await Promise.all([
    OnboardingResponse.deleteMany({ userId }),
    WorkoutLog.deleteMany({ traineeId: userId }),
    PersonalRecord.deleteMany({ userId }),
    Achievement.deleteMany({ traineeId: userId }),
    BodyMetric.deleteMany({ traineeId: userId }),
    MealLog.deleteMany({ traineeId: userId }),
    CardioLog.deleteMany({ traineeId: userId }),
    OwnCardioWorkout.deleteMany({ traineeId: userId }),
    OwnNutritionTarget.deleteMany({ traineeId: userId }),
    WaterLog.deleteMany({ traineeId: userId }),
    // Coach-owned, but about her (her plans, menus, AI drafts with her profile, the chat): no use
    // to anyone once she is gone, and they hold her health details.
    Plan.deleteMany({ traineeId: userId }),
    NutritionPlan.deleteMany({ traineeId: userId }),
    NutritionPlanVersion.deleteMany({ traineeId: userId }),
    AiRecommendation.deleteMany({ traineeId: userId }),
    Message.deleteMany({ traineeId: userId }),
    Reaction.deleteMany({ traineeId: userId }),
    // Her coaches' notifications about her carry her name.
    Notification.deleteMany({ 'data.traineeId': { $in: [traineeId, userId] } }),
  ]);
}

/** A coach's own content. System foods are never touched (scope 'system' has no coachId). */
async function deleteCoachData(userId: Id): Promise<void> {
  const communities = await Community.find({ coachId: userId }).select('_id').lean();
  const communityIds = communities.map((community) => community._id);
  await Promise.all([
    CoachProfile.deleteMany({ userId }),
    Membership.deleteMany({ communityId: { $in: communityIds } }),
    Community.deleteMany({ coachId: userId }),
    Invite.deleteMany({ coachId: userId }),
    FoodItem.deleteMany({ scope: 'coach', coachId: userId }),
    Template.deleteMany({ coachId: userId }),
    Recipe.deleteMany({ coachId: userId }),
    TrainingSettings.deleteMany({ coachId: userId }),
    NutritionSettings.deleteMany({ coachId: userId }),
    AiRecommendation.deleteMany({ coachId: userId }),
    Message.deleteMany({ coachId: userId }),
    Reaction.deleteMany({ coachId: userId }),
  ]);
}

export interface AccountDeletionInput {
  password?: string;
  confirmWord?: string;
}

/**
 * Deletes the calling user's own account (never anyone else's: the id comes from her token).
 * Admin accounts are refused; a coach with live trainees (waiting or active) is refused until she
 * ends those coachings.
 */
export async function deleteOwnAccount(userId: string, input: AccountDeletionInput, now: Date = new Date()): Promise<void> {
  const user = await User.findById(userId).select('roles passwordHash');
  if (!user) return;

  if (hasRole(user, 'admin')) throw new AdminAccountDeletionError('account_admin_cannot_delete');
  await checkConfirmation(user.passwordHash, input.password, input.confirmWord);
  if (hasRole(user, 'coach')) {
    const liveTrainees = await Coaching.countDocuments({ coachId: userId, live: true });
    if (liveTrainees > 0) throw new CoachHasTraineesError('account_coach_has_trainees', { count: liveTrainees });
  }

  await deleteStoredPhotos(userId);

  // Her coachings as a trainee end (the coach keeps the dates, nothing else).
  await Coaching.updateMany({ traineeId: userId, live: true }, { $set: { status: 'ended', live: false, endedAt: now } });
  await Promise.all([
    deleteTraineeData(userId),
    hasRole(user, 'coach') ? deleteCoachData(userId) : Promise.resolve(),
    Membership.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
  ]);
  // Last: with the user gone, every token she holds fails requireAuth.
  await User.deleteOne({ _id: userId });
}
