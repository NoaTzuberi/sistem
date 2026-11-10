/**
 * One-time cleanup (owner, 2026-11-10): the empty drafts the old "duplicate → empty draft → duplicate" loop left behind.
 * Empty = planDraftContent.ts isEmptyDraft: a standalone draft (not a week of a multi-week plan) with no workouts, or
 * only strength workouts without exercises. A draft a workout was logged from is never touched.
 * DRY RUN by default; counts only — no names, ids or emails, never connection strings or .env values.
 *
 *   npm run cleanup:empty-drafts                                  (dry run, local database)
 *   npm run cleanup:empty-drafts -- --apply
 *   npm run cleanup:empty-drafts -- --env-file .env.prod --allow-remote [--apply]   (production: both flags required)
 */
import '../../../config/envFile';
import mongoose from 'mongoose';
import { config } from '../../../config/env';
import { connectDatabase } from '../../../config/database';
import { assertSetupDatabase, describeDatabaseUrl } from '../../users/scripts/devDatabaseGuard';
import { WorkoutLog } from '../../workoutLogs/workoutLog.model';
import { Plan } from '../plan.model';
import { isEmptyDraft } from '../planDraftContent';

/** Production = NODE_ENV, or an env file / database whose name says "prod". */
function looksLikeProduction(): boolean {
  const databaseName = config.databaseUrl ? describeDatabaseUrl(config.databaseUrl).databaseName : '';
  return config.nodeEnv === 'production' || /prod/i.test(process.env.SISTEM_ENV_FILE ?? '') || /prod/i.test(databaseName);
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const allowRemote = argv.includes('--allow-remote');
  if (looksLikeProduction() && !(argv.includes('--env-file') && allowRemote)) {
    console.error('Refusing to run: this looks like production. Pass both --env-file <file> and --allow-remote if you mean it.');
    process.exit(1);
  }
  assertSetupDatabase(allowRemote);
  await connectDatabase();
  try {
    const drafts = await Plan.find({ status: 'draft', blockId: null })
      .select('status blockId workouts.kind workouts.exercises._id')
      .lean();
    const empty = drafts.filter((plan) => isEmptyDraft(plan));
    const logged = new Set((await WorkoutLog.distinct('planId', { planId: { $in: empty.map((plan) => plan._id) } })).map(String));
    const toDelete = empty.filter((plan) => !logged.has(String(plan._id)));

    console.log(`Standalone drafts: ${drafts.length}`);
    console.log(`Empty drafts: ${empty.length} (kept because a workout was logged from them: ${logged.size})`);
    if (!apply) {
      console.log(`DRY RUN: ${toDelete.length} empty drafts would be deleted. Re-run with --apply to delete them.`);
      return;
    }
    // Checked again in the delete itself: a draft that got content or was published meanwhile stays.
    const ids = toDelete.map((plan) => plan._id);
    const result = await Plan.deleteMany({ _id: { $in: ids }, status: 'draft', blockId: null, 'workouts.exercises.0': { $exists: false }, 'workouts.kind': { $ne: 'cardio' } });
    console.log(`Deleted: ${result.deletedCount} empty drafts.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message.replace(/mongodb(\+srv)?:\/\/\S+/g, '[url]') : 'cleanup:empty-drafts failed.');
  process.exit(1);
});
