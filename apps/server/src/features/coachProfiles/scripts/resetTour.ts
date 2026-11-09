/**
 * DEV ONLY: shows the dashboard welcome + tour again for one coach, by clearing her
 * CoachProfile.tourCompletedAt (the one "seen" mark for both).
 *
 *   npm run dev:reset-tour -- <coach email>                  (local database)
 *   npm run dev:reset-tour -- <coach email> --allow-remote   (non-local DEV database)
 *
 * Refuses NODE_ENV=production and --env-file, and refuses anything that looks like production (an env file or a
 * database name containing "prod", e.g. Sistem-prod) even with --allow-remote. Prints the target
 * database (hosts + name, never credentials) and her current value before clearing it.
 */
import mongoose from 'mongoose';
import { config } from '../../../config/env';
import { connectDatabase } from '../../../config/database';
import { User } from '../../users/user.model';
import { CoachProfile } from '../coachProfile.model';
import { assertDevDatabase, describeDatabaseUrl } from '../../users/scripts/devDatabaseGuard';

function looksLikeProduction(): boolean {
  const envFile = process.env.SISTEM_ENV_FILE ?? '';
  const databaseName = config.databaseUrl ? describeDatabaseUrl(config.databaseUrl).databaseName : '';
  return /prod/i.test(envFile) || /prod/i.test(databaseName);
}

async function main() {
  const args = process.argv.slice(2);
  const allowRemote = args.includes('--allow-remote');
  const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase();

  // DEV ONLY: always apps/server/.env. Another env file (e.g. .env.prod) is never loaded.
  if (args.includes('--env-file')) {
    console.error('Refusing to run: --env-file is not supported. This script only uses the dev apps/server/.env.');
    process.exit(1);
  }
  if (!email) {
    console.error('Usage: npm run dev:reset-tour -- <coach email> [--allow-remote]');
    process.exit(1);
  }
  if (looksLikeProduction()) {
    console.error('Refusing to run: this looks like the production database (env file or database name contains "prod").');
    process.exit(1);
  }
  assertDevDatabase(allowRemote);

  await connectDatabase();
  try {
    const user = await User.findOne({ email }).select('_id').lean();
    if (!user) {
      console.error(`No user with email ${email}.`);
      process.exitCode = 1;
      return;
    }
    const profile = await CoachProfile.findOne({ userId: user._id }).select('tourCompletedAt').lean();
    if (!profile) {
      console.error(`${email} has no coach profile (not a coach).`);
      process.exitCode = 1;
      return;
    }
    const before = profile.tourCompletedAt ? profile.tourCompletedAt.toISOString() : 'not set';
    await CoachProfile.updateOne({ userId: user._id }, { $set: { tourCompletedAt: null } });
    console.log(`tourCompletedAt was: ${before}. Cleared — reload the dashboard to see the welcome.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
