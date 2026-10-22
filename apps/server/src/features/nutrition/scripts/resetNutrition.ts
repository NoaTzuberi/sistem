/**
 * DEV ONLY: deletes one coach's nutrition data so it can be seeded again from the coach's
 * md food lists (owner decision, 2026-10-08 — the old PDF guide is no longer a source).
 *
 *   npm run reset:nutrition -- <coachEmail> --allow-remote          (counts only, nothing deleted)
 *   npm run reset:nutrition -- <coachEmail> --allow-remote --yes    (deletes, then counts again)
 *
 * Deletes the coach's food items, nutrition templates, nutrition plans + published versions and
 * meal logs (their meal photos too), and resets her trainees' "intro read" marker. Training plans,
 * logs, users and her nutrition settings stay. Same database guard as seed:dev.
 */
import mongoose from 'mongoose';
import type { Types } from 'mongoose';
import { connectDatabase } from '../../../config/database';
import { User } from '../../users/user.model';
import { assertDevDatabase } from '../../users/scripts/devDatabaseGuard';
import { Template } from '../../templates/template.model';
import { MealLog } from '../../mealLogs/mealLog.model';
import { deletePrivatePhoto } from '../../privatePhotos/privatePhoto.service';
import { FoodItem } from '../foodItem.model';
import { NutritionPlan, NutritionPlanVersion } from '../nutritionPlan.model';

async function counts(coachId: Types.ObjectId) {
  const [foodItems, templates, plans, versions, mealLogs] = await Promise.all([
    FoodItem.countDocuments({ coachId }),
    Template.countDocuments({ coachId, type: 'nutrition_plan' }),
    NutritionPlan.countDocuments({ coachId }),
    NutritionPlanVersion.countDocuments({ coachId }),
    MealLog.countDocuments({ coachId }),
  ]);
  return { foodItems, templates, plans, versions, mealLogs };
}

async function main() {
  const argv = process.argv.slice(2);
  const email = argv.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run reset:nutrition -- <coachEmail> [--allow-remote] [--yes]');
    process.exit(1);
  }
  assertDevDatabase(argv.includes('--allow-remote'));
  await connectDatabase();
  try {
    const coach = await User.findOne({ email, roles: 'coach' }).select('_id').lean();
    if (!coach) {
      console.error('No coach with that email.');
      process.exitCode = 1;
      return;
    }
    console.log('Before:', await counts(coach._id));
    if (!argv.includes('--yes')) {
      console.log('Nothing deleted (add --yes to delete).');
      return;
    }

    const photos = await MealLog.find({ coachId: coach._id, 'photos.0': { $exists: true } }).select('photos').lean();
    for (const log of photos) {
      for (const photo of log.photos) {
        await deletePrivatePhoto(photo.publicId).catch((error) => console.error(`Could not delete a meal photo: ${String(error)}`));
      }
    }
    await Promise.all([
      FoodItem.deleteMany({ coachId: coach._id }),
      Template.deleteMany({ coachId: coach._id, type: 'nutrition_plan' }),
      NutritionPlan.deleteMany({ coachId: coach._id }),
      NutritionPlanVersion.deleteMany({ coachId: coach._id }),
      MealLog.deleteMany({ coachId: coach._id }),
      User.updateMany({ coachId: coach._id }, { $set: { nutritionIntroSeenVersion: 0 } }),
    ]);
    console.log('After:', await counts(coach._id));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
