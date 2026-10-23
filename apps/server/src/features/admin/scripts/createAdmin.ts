/**
 * Creates the admin account, or gives an existing account the admin role.
 *
 *   ADMIN_EMAIL=<email> ADMIN_PASSWORD=<12+ characters> npm run create:admin
 *   npm run create:admin -- --allow-remote      (non-local database, e.g. production)
 *   npm run create:admin -- --reset-password    (also set ADMIN_PASSWORD on an existing account)
 *
 * Reads DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD and optional ADMIN_NAME from the environment
 * (apps/server/.env, or the shell — prefer passing ADMIN_PASSWORD in the shell, not keeping it in .env).
 * A new account gets ONLY the admin role. An existing account keeps her roles and password (unless
 * --reset-password). ADMIN_PASSWORD is required only when an account is created or reset; it must be
 * 12+ characters and never the public seed:dev password. The password is never printed.
 *
 * Unlike seed:dev / promote:coach this is not dev-only (production needs an admin too), but it always
 * prints the target database and refuses a non-local one unless --allow-remote is passed.
 * Safe to re-run.
 */
import mongoose from 'mongoose';
import { config } from '../../../config/env';
import { connectDatabase } from '../../../config/database';
import { describeDatabaseUrl } from '../../users/scripts/devDatabaseGuard';
import { readCreateAdminInput } from './createAdminInput';
import { createOrPromoteAdmin } from './adminAccount';

async function main() {
  const result = readCreateAdminInput(process.env, process.argv.slice(2));
  if (!result.ok) {
    console.error(result.error);
    console.error('Usage: ADMIN_EMAIL=<email> ADMIN_PASSWORD=<password> npm run create:admin [-- --allow-remote] [--reset-password]');
    process.exit(1);
  }
  const { input } = result;

  if (!config.databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  // describeDatabaseUrl strips credentials: only hosts + database name are printed.
  const target = describeDatabaseUrl(config.databaseUrl);
  console.log(`Database: ${target.hosts.join(', ')} / ${target.databaseName}`);
  if (!target.isLocal) {
    if (!input.allowRemote) {
      console.error('Refusing to run: DATABASE_URL points to a non-local database. Re-run with --allow-remote if you mean it.');
      process.exit(1);
    }
    console.warn('WARNING: --allow-remote given — writing to a NON-LOCAL database.');
  }

  await connectDatabase();
  try {
    const outcome = await createOrPromoteAdmin(input);
    switch (outcome.kind) {
      case 'created':
        console.log(`Created admin account ${input.email} (admin role only). Log in to the dashboard with it.`);
        break;
      case 'promoted':
        console.log(`${input.email} now has the admin role (other roles kept).`);
        break;
      case 'already_admin':
        console.log(`${input.email} is already an admin.`);
        break;
      case 'missing_password':
        console.error(`No account with email ${input.email}. Set ADMIN_PASSWORD to create it.`);
        process.exitCode = 1;
        return;
    }
    if (outcome.kind !== 'created') {
      if (outcome.passwordReset) console.log('Password updated.');
      else if (input.password) console.log('Existing password kept (ADMIN_PASSWORD ignored). Add --reset-password to change it.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  // Only the message: a Mongoose validation error can echo document fields.
  console.error(error instanceof Error ? error.message : 'create:admin failed.');
  process.exit(1);
});
