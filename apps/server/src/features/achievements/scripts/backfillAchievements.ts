/**
 * DEV ONLY: awards the achievements existing data has already earned (Phase 11), for
 * every trainee, with the same evaluator as a live save. Each one is dated to when its
 * rule was met (the Nth workout's finish, the log that completed a week, the photo's
 * upload…) and marked seen, so old data never triggers a celebration.
 *
 *   npm run backfill:achievements                   (local database)
 *   npm run backfill:achievements -- --allow-remote (non-local dev database)
 *
 * Re-running is safe: an achievement is never stored twice (unique traineeId + key).
 * Same database guard as seed:dev.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../../../config/database';
import { User } from '../../users/user.model';
import { assertDevDatabase } from '../../users/scripts/devDatabaseGuard';
import { evaluateAchievements } from '../achievement.service';

async function main() {
  assertDevDatabase(process.argv.slice(2).includes('--allow-remote'));

  await connectDatabase();
  try {
    const trainees = await User.find({ roles: 'trainee' }).select('email').lean();
    let total = 0;
    for (const trainee of trainees) {
      const created = await evaluateAchievements(String(trainee._id), { backfill: true });
      total += created.length;
      const types = created.map((achievement) => achievement.type).join(', ');
      console.log(`  ${trainee.email}: ${created.length} new${created.length > 0 ? ` (${types})` : ''}`);
    }
    console.log(`\n${trainees.length} trainee(s), ${total} achievement(s) awarded.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
