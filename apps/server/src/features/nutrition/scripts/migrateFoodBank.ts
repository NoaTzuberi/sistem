/**
 * One-time move to the app-wide food bank (owner 2026-10-28): the source coach's food items become system
 * items in place (same _id — plans, versions, templates and meal logs keep working). Idempotent.
 *
 *   npm run migrate:food-bank                                   (dry run: counts only, writes nothing)
 *   npm run migrate:food-bank -- --apply                        (writes)
 *   npm run migrate:food-bank -- --from <coachEmail>            (source coach; default coach@sistem.dev)
 *   add --allow-remote for a non-local database (production included)
 *   add --env-file <path> to use that file instead of .env (e.g. .env.prod)
 *
 * Prints the target database (hosts + name only) and counts — never connection strings or .env values.
 */
import '../../../config/envFile';
import mongoose from 'mongoose';
import { connectDatabase } from '../../../config/database';
import { User } from '../../users/user.model';
import { assertSetupDatabase } from '../../users/scripts/devDatabaseGuard';
import { FoodItem } from '../foodItem.model';
import { migrateFoodBank } from '../foodBankMigration';

const DEFAULT_SOURCE = 'coach@sistem.dev';

function readArgs(argv: string[]) {
  const fromIndex = argv.indexOf('--from');
  return {
    apply: argv.includes('--apply'),
    allowRemote: argv.includes('--allow-remote'),
    from: (fromIndex >= 0 ? argv[fromIndex + 1] : DEFAULT_SOURCE)?.trim().toLowerCase(),
  };
}

async function main() {
  const { apply, allowRemote, from } = readArgs(process.argv.slice(2));
  if (!from) {
    console.error('Usage: npm run migrate:food-bank -- [--from <coachEmail>] [--apply] [--allow-remote]');
    process.exit(1);
  }
  assertSetupDatabase(allowRemote);
  await connectDatabase();
  try {
    const source = await User.findOne({ email: from }).select('_id').lean();
    if (!source) {
      console.error('No account with the source email.');
      process.exitCode = 1;
      return;
    }
    // The unique itemKey index (no duplicate system items) must exist before writing.
    if (apply) await FoodItem.init();
    const report = await migrateFoodBank({ sourceCoachId: String(source._id), apply });
    console.log(apply ? 'APPLIED.' : 'DRY RUN — nothing written. Re-run with --apply to write.');
    console.log(`Source coach items: ${report.sourceItems}`);
    console.log(`${apply ? 'Converted' : 'Would convert'} to system items: ${report.converted}`);
    console.log(`Skipped (key already a system item): ${report.skippedAlreadySystem}`);
    console.log(`Other coaches' unchanged copies of system items (left as they are): ${report.unchangedDuplicates.length}`);
    for (const duplicate of report.unchangedDuplicates) {
      console.log(`  coach ${duplicate.coachId} · item ${duplicate.foodId} · ${duplicate.itemKey}`);
    }
    console.log(`System items now: ${await FoodItem.countDocuments({ scope: 'system' })}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'migrate:food-bank failed.');
  process.exit(1);
});
