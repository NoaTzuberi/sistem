/**
 * DEV ONLY: sets a new password for one test account (passwords are hashed and can't be read back).
 *
 *   npm run dev:set-password -- <email>                  (local database)
 *   npm run dev:set-password -- <email> --allow-remote   (non-local DEV database)
 *   add --force for an address outside the test domains (TEST_EMAIL_DOMAINS)
 *
 * The password is typed at a hidden prompt — never an argument (shell history) and never printed.
 * Hashed like sign-up (bcrypt, SALT_ROUNDS); sessionVersion is raised so every existing session ends,
 * and any open reset link is cancelled. Refuses unless NODE_ENV resolves to "development", refuses
 * --env-file, and refuses anything that looks like production (env file or database name containing
 * "prod", e.g. Sistem-prod) even with --allow-remote.
 */
import readline from 'readline';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { config } from '../../../config/env';
import { connectDatabase } from '../../../config/database';
import { User } from '../user.model';
import { SALT_ROUNDS } from '../../auth/auth.service';
import { TEST_EMAIL_DOMAINS, isTestEmail } from '../testEmail';
import { assertDevDatabase, describeDatabaseUrl } from './devDatabaseGuard';

// Same rule as sign-up (auth.validation.ts).
const MIN_PASSWORD_LENGTH = 8;

function looksLikeProduction(): boolean {
  const envFile = process.env.SISTEM_ENV_FILE ?? '';
  const databaseName = config.databaseUrl ? describeDatabaseUrl(config.databaseUrl).databaseName : '';
  return /prod/i.test(envFile) || /prod/i.test(databaseName);
}

/** Reads one line without echoing it (the typed characters are never written to the terminal). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('Run this in an interactive terminal (the password is typed at a hidden prompt).'));
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (text: string) => void };
    let prompted = false;
    output._writeToOutput = (text: string) => {
      // The prompt itself once; nothing of what is typed after it.
      if (!prompted) {
        process.stdout.write(text);
        prompted = true;
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const allowRemote = args.includes('--allow-remote');
  const force = args.includes('--force');
  const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase();

  // DEV ONLY: always apps/server/.env. Another env file (e.g. .env.prod) is never loaded.
  if (args.includes('--env-file')) {
    console.error('Refusing to run: --env-file is not supported. This script only uses the dev apps/server/.env.');
    process.exit(1);
  }
  if (!email) {
    console.error('Usage: npm run dev:set-password -- <email> [--allow-remote] [--force]');
    process.exit(1);
  }
  if (config.nodeEnv !== 'development') {
    console.error(`Refusing to run: NODE_ENV is "${config.nodeEnv}", not "development".`);
    process.exit(1);
  }
  if (looksLikeProduction()) {
    console.error('Refusing to run: this looks like the production database (env file or database name contains "prod").');
    process.exit(1);
  }
  if (!isTestEmail(email) && !force) {
    console.error(`Refusing to run: ${email} is not a test address (${TEST_EMAIL_DOMAINS.join(', ')}). Add --force if you mean it.`);
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

    const password = await askHidden(`New password for ${email}: `);
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters. Nothing changed.`);
      process.exitCode = 1;
      return;
    }
    const again = await askHidden('Type it again: ');
    if (again !== password) {
      console.error('The two passwords are not the same. Nothing changed.');
      process.exitCode = 1;
      return;
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash: await bcrypt.hash(password, SALT_ROUNDS) },
        $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
        $inc: { sessionVersion: 1 },
      },
    );
    console.log(`Password updated for ${email}. Every existing session was signed out.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
