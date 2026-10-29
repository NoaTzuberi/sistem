/**
 * READ-ONLY: where a database stands with the food bank (owner 2026-10-28). Counts only — no names, no emails,
 * never connection strings or .env values.
 *
 *   npm run status:food-bank -- --allow-remote
 *   npm run status:food-bank -- --env-file .env.prod --allow-remote
 *   npm run status:food-bank -- --coach <email>      (prints only whether that coach account exists: yes / no)
 */
import '../../../config/envFile';
import mongoose from 'mongoose';
import { connectDatabase } from '../../../config/database';
import { User } from '../../users/user.model';
import { assertSetupDatabase } from '../../users/scripts/devDatabaseGuard';
import { FoodItem } from '../foodItem.model';

async function main() {
  const argv = process.argv.slice(2);
  const coachIndex = argv.indexOf('--coach');
  const coachEmail = coachIndex >= 0 ? argv[coachIndex + 1]?.trim().toLowerCase() : undefined;
  assertSetupDatabase(argv.includes('--allow-remote'));
  await connectDatabase();
  try {
    const [system, systemActive, coachItems, legacy, coachesWithItems, coaches] = await Promise.all([
      FoodItem.countDocuments({ scope: 'system' }),
      FoodItem.countDocuments({ scope: 'system', archivedAt: null }),
      FoodItem.countDocuments({ scope: 'coach' }),
      // Before the food bank: no scope field (migrate:food-bank turns one coach's into system items).
      FoodItem.countDocuments({ scope: { $exists: false } }),
      FoodItem.distinct('coachId', { coachId: { $ne: null } }),
      User.countDocuments({ roles: 'coach' }),
    ]);
    console.log(`System food items: ${system} (${systemActive} active)`);
    console.log(`Coach items: ${coachItems} · items from before the food bank (no scope): ${legacy}`);
    console.log(`Coaches owning items: ${coachesWithItems.length} · coach accounts: ${coaches}`);
    if (coachEmail) console.log(`Coach account exists: ${(await User.exists({ email: coachEmail, roles: 'coach' })) ? 'yes' : 'no'}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message.replace(/mongodb(\+srv)?:\/\/\S+/g, '[url]') : 'status:food-bank failed.');
  process.exit(1);
});
