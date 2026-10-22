/**
 * DEV ONLY: give an existing user the coach role (+ her coach profile and primary community), so
 * coach mode and the dashboard can be tested with a real account. In production coaches are created
 * by the admin (dashboard → Coaches), never promoted.
 *
 *   npm run promote:coach -- <email>                  (local database)
 *   npm run promote:coach -- <email> --allow-remote   (non-local dev database)
 *
 * Refuses to run when NODE_ENV=production. Refuses a non-local database unless --allow-remote is
 * passed, and always prints which database it is about to touch. Trainees are never assigned to her:
 * they join through her invite link.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../../../config/database';
import { User, hasRole } from '../user.model';
import { ensureCoachSetup } from '../../coachProfiles/coachProfile.service';
import { assertDevDatabase } from './devDatabaseGuard';

async function main() {
  const args = process.argv.slice(2);
  const allowRemote = args.includes('--allow-remote');
  const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase();

  if (!email) {
    console.error('Usage: npm run promote:coach -- <email> [--allow-remote]');
    process.exit(1);
  }

  assertDevDatabase(allowRemote);

  await connectDatabase();
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`No user with email ${email}.`);
      process.exitCode = 1;
      return;
    }
    if (hasRole(user, 'coach')) {
      console.log(`${email} is already a coach.`);
    } else {
      user.roles = [...user.roles, 'coach'];
      await user.save();
      console.log(`${email} is now a coach.`);
    }
    await ensureCoachSetup(user._id, user.name);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
