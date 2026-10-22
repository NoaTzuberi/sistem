import mongoose, { Types } from 'mongoose';
import { config } from '../../config/env';
import { User } from '../users/user.model';
import { Plan } from '../plans/plan.model';
import { NutritionPlan, NutritionPlanVersion } from '../nutrition/nutritionPlan.model';
import { AiRecommendation } from '../aiRecommendations/aiRecommendation.model';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';
import { CardioLog } from '../cardio/cardio.model';
import { MealLog } from '../mealLogs/mealLog.model';
import { ensureCoachSetup } from '../coachProfiles/coachProfile.service';
import { getPrimaryCommunityId, joinCommunity } from '../communities/community.service';
import { Coaching } from './coaching.model';

type Collection = mongoose.mongo.Collection<mongoose.mongo.Document>;

// One-off (runs at server start, idempotent — every step only touches what is still in the old
// shape). Order matters: roles → coach profiles → coachings from User.coachId → coachingId on every
// coach-owned record → the unique indexes move from trainee to coaching.

export interface AccountsMigrationResult {
  roles: number;
  coaches: number;
  coachings: number;
  /** Coachings made 'ended' for records whose trainee had since moved to another coach (history kept). */
  endedCoachings: number;
  records: number;
}

/** Old indexes that the new per-coaching ones replace. */
const OLD_INDEXES: [mongoose.Model<never>, string][] = [
  [Plan as unknown as mongoose.Model<never>, 'traineeId_1_weekStartDate_1'],
  [NutritionPlan as unknown as mongoose.Model<never>, 'traineeId_1'],
  [AiRecommendation as unknown as mongoose.Model<never>, 'one_active_per_trainee_type'],
  [User as unknown as mongoose.Model<never>, 'coachId_1_role_1_createdAt_-1'],
];

async function dropIndexIfPresent(collection: Collection, name: string): Promise<void> {
  const indexes = await collection.indexes().catch(() => []);
  if (indexes.some((index) => index.name === name)) await collection.dropIndex(name);
}

/** The pair's coaching: live first, else the newest ended one, else a new 'ended' one (history only). */
async function coachingForPair(traineeId: Types.ObjectId, coachId: Types.ObjectId, result: AccountsMigrationResult): Promise<Types.ObjectId> {
  const existing = await Coaching.findOne({ traineeId, coachId }).sort({ live: -1, startedAt: -1 }).select('_id').lean();
  if (existing) return existing._id;
  const now = new Date();
  const ended = await Coaching.create({ traineeId, coachId, status: 'ended', startedAt: now, endedAt: now });
  result.endedCoachings += 1;
  return ended._id;
}

/** Records with traineeId + coachId and no coachingId yet. */
async function backfillByPair(collection: Collection, result: AccountsMigrationResult): Promise<void> {
  const pairs = await collection
    .aggregate<{ _id: { traineeId: Types.ObjectId; coachId: Types.ObjectId } }>([
      { $match: { coachingId: { $exists: false } } },
      { $group: { _id: { traineeId: '$traineeId', coachId: '$coachId' } } },
    ])
    .toArray();
  for (const { _id: pair } of pairs) {
    if (!pair.traineeId || !pair.coachId) continue;
    const coachingId = await coachingForPair(pair.traineeId, pair.coachId, result);
    const updated = await collection.updateMany(
      { traineeId: pair.traineeId, coachId: pair.coachId, coachingId: { $exists: false } },
      { $set: { coachingId } },
    );
    result.records += updated.modifiedCount;
  }
}

/** Logs take their plan's coaching. */
async function backfillByPlan(collection: Collection, result: AccountsMigrationResult): Promise<void> {
  const planIds = await collection.distinct('planId', { coachingId: { $exists: false } });
  if (planIds.length === 0) return;
  const plans = await Plan.find({ _id: { $in: planIds } }).select('coachingId').lean();
  for (const plan of plans) {
    if (!plan.coachingId) continue;
    const updated = await collection.updateMany({ planId: plan._id, coachingId: { $exists: false } }, { $set: { coachingId: plan.coachingId } });
    result.records += updated.modifiedCount;
  }
}

export async function migrateAccounts(): Promise<AccountsMigrationResult> {
  const result: AccountsMigrationResult = { roles: 0, coaches: 0, coachings: 0, endedCoachings: 0, records: 0 };
  const db = mongoose.connection.db;
  if (!db) return result;
  const users = db.collection('users');

  // 1. role → roles[].
  const roles = await users.updateMany({ role: { $exists: true }, roles: { $exists: false } }, [{ $set: { roles: ['$role'] } }]);
  result.roles = roles.modifiedCount;
  await users.updateMany({ role: { $exists: true }, roles: { $exists: true } }, { $unset: { role: '' } });

  // 2. The admin by env (never hard-coded): adds the role, keeps her others.
  if (config.adminEmail) await users.updateOne({ email: config.adminEmail }, { $addToSet: { roles: 'admin' } });

  // 3. Every coach gets her profile + primary community.
  for (const coach of await users.find({ roles: 'coach' }).project<{ _id: Types.ObjectId; name: string }>({ name: 1 }).toArray()) {
    const before = await mongoose.connection.db!.collection('coachprofiles').countDocuments({ userId: coach._id });
    await ensureCoachSetup(coach._id, coach.name);
    if (before === 0) result.coaches += 1;
  }

  // 4. User.coachId → a Coaching (active when that coach already published her a plan) + her coach's
  //    primary community; then the field goes.
  const linked = await users
    .find({ coachId: { $type: 'objectId' } })
    .project<{ _id: Types.ObjectId; coachId: Types.ObjectId; createdAt?: Date }>({ coachId: 1, createdAt: 1 })
    .toArray();
  for (const trainee of linked) {
    if (!(await Coaching.exists({ traineeId: trainee._id, coachId: trainee.coachId, live: true }))) {
      const published = await Plan.exists({ traineeId: trainee._id, coachId: trainee.coachId, status: 'published' });
      await Coaching.create({
        traineeId: trainee._id,
        coachId: trainee.coachId,
        status: published ? 'active' : 'waiting',
        startedAt: trainee.createdAt ?? new Date(),
      });
      result.coachings += 1;
    }
    const communityId = await getPrimaryCommunityId(trainee.coachId);
    if (communityId) await joinCommunity(trainee._id, communityId);
  }
  await users.updateMany({ coachId: { $exists: true } }, { $unset: { coachId: '' } });

  // 5. coachingId on every coach-owned record (plans first: the logs read theirs).
  for (const name of ['plans', 'nutritionplans', 'nutritionplanversions', 'meallogs', 'airecommendations']) {
    await backfillByPair(db.collection(name), result);
  }
  for (const name of ['workoutlogs', 'cardiologs']) {
    await backfillByPlan(db.collection(name), result);
  }

  // 6. Unique indexes: per coaching, no longer per trainee.
  for (const [model, index] of OLD_INDEXES) await dropIndexIfPresent(model.collection as unknown as Collection, index);
  await Promise.all([Plan, NutritionPlan, NutritionPlanVersion, AiRecommendation, WorkoutLog, CardioLog, MealLog, User, Coaching].map((model) =>
    (model as unknown as mongoose.Model<unknown>).createIndexes(),
  ));
  return result;
}
