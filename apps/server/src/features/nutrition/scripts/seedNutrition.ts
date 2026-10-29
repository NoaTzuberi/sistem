/**
 * Seeds the app-wide food bank (system items, owner 2026-10-28) from the coach's md food lists. First setup
 * of any database (a fresh one included) — no coach needed. DRY RUN by default (counts only); --apply writes.
 *
 *   npm run seed:nutrition                                (local database, dry run)
 *   npm run seed:nutrition -- --apply                     (writes)
 *   npm run seed:nutrition -- --allow-remote              (non-local database, production included)
 *   npm run seed:nutrition -- --env-file .env.prod        (that file instead of .env — run from apps/server paths)
 *   npm run seed:nutrition -- --file <path>               (another data file)
 *   npm run seed:nutrition -- --template-coach <email>    (also give the file's template, if any, to this coach)
 *
 * The data (apps/server/data/nutrition/food-lists.json, made from docs/reference/*.md) is the coach's own
 * content: gitignored, never committed (the repo will become public). Re-running is safe — items are matched
 * by their itemKey and never duplicated; existing ones are left as they are (the admin may have edited them).
 */
import '../../../config/envFile';
import path from 'node:path';
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { connectDatabase } from '../../../config/database';
import { User } from '../../users/user.model';
import { assertSetupDatabase } from '../../users/scripts/devDatabaseGuard';
import { FoodItem } from '../foodItem.model';
import { NUTRITION_SEED_FILES, applyNutritionSeed, planNutritionSeed, readNutritionSeedFile } from '../nutritionSeed';

function valueAfter(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function readArgs(argv: string[]) {
  const file = valueAfter(argv, '--file');
  return {
    allowRemote: argv.includes('--allow-remote'),
    apply: argv.includes('--apply'),
    templateCoach: valueAfter(argv, '--template-coach')?.trim().toLowerCase(),
    files: file ? [path.resolve(file)] : NUTRITION_SEED_FILES.filter((candidate) => existsSync(candidate)),
  };
}

async function main() {
  const { allowRemote, apply, templateCoach, files } = readArgs(process.argv.slice(2));
  const missing = files.find((file) => !existsSync(file));
  if (files.length === 0 || missing) {
    console.error(`No seed file${missing ? ` at ${missing}` : 's in apps/server/data/nutrition/'}. It is the coach's own content (gitignored) — see the Phase 13a report.`);
    process.exit(1);
  }
  assertSetupDatabase(allowRemote);
  await connectDatabase();
  try {
    if (!apply) {
      for (const file of files) {
        const plan = await planNutritionSeed(await readNutritionSeedFile(file));
        console.log(`DRY RUN — ${path.basename(file)}: would create ${plan.wouldCreate} system food items, ${plan.alreadyThere} already there.`);
      }
      console.log(`System items now: ${await FoodItem.countDocuments({ scope: 'system' })}. Re-run with --apply to write.`);
      return;
    }
    // The unique itemKey index must exist before upserting (no duplicates even on a fresh database).
    await FoodItem.init();
    let templateCoachId: string | undefined;
    if (templateCoach) {
      const coach = await User.findOne({ email: templateCoach, roles: 'coach' }).select('_id').lean();
      if (!coach) {
        console.error('No coach with that email.');
        process.exitCode = 1;
        return;
      }
      templateCoachId = String(coach._id);
    }
    for (const file of files) {
      const result = await applyNutritionSeed(await readNutritionSeedFile(file), { templateCoachId });
      console.log(
        `${path.basename(file)} — system food items: ${result.foodsCreated} created, ${result.foodsKept} already there ` +
          `(${result.categoriesFilled} got a category). ` +
          (result.templateCreated === null ? '' : `Template: ${result.templateCreated ? 'created' : 'already there'}.`),
      );
    }
    console.log(`System items now: ${await FoodItem.countDocuments({ scope: 'system' })}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'seed:nutrition failed.');
  process.exit(1);
});
