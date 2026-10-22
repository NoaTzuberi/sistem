/**
 * Seeds a coach's food list from the coach's md food lists (Phase 13a / 13a+). DEV + first setup.
 *
 *   npm run seed:nutrition -- <coachEmail>                  (local database)
 *   npm run seed:nutrition -- <coachEmail> --allow-remote   (non-local dev database)
 *   npm run seed:nutrition -- <coachEmail> --file <path>    (another data file)
 *
 * The data (apps/server/data/nutrition/food-lists.json, made from docs/reference/*.md) is the
 * coach's own content: gitignored, never committed. Re-running is safe — items and the template that were already seeded are left as
 * they are (the coach may have edited them); only missing items are added.
 * Same database guard as seed:dev.
 */
import path from 'node:path';
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { connectDatabase } from '../../../config/database';
import { User } from '../../users/user.model';
import { assertDevDatabase } from '../../users/scripts/devDatabaseGuard';
import { NUTRITION_SEED_FILES, applyNutritionSeed, readNutritionSeedFile } from '../nutritionSeed';

function readArgs(argv: string[]) {
  const fileIndex = argv.indexOf('--file');
  return {
    email: argv.find((arg, index) => !arg.startsWith('--') && argv[index - 1] !== '--file')?.trim().toLowerCase(),
    allowRemote: argv.includes('--allow-remote'),
    files: fileIndex >= 0 ? [path.resolve(argv[fileIndex + 1] ?? '')] : NUTRITION_SEED_FILES.filter((file) => existsSync(file)),
  };
}

async function main() {
  const { email, allowRemote, files } = readArgs(process.argv.slice(2));
  if (!email) {
    console.error('Usage: npm run seed:nutrition -- <coachEmail> [--allow-remote] [--file <path>]');
    process.exit(1);
  }
  const missing = files.find((file) => !existsSync(file));
  if (files.length === 0 || missing) {
    console.error(`No seed file${missing ? ` at ${missing}` : 's in apps/server/data/nutrition/'}. It is the coach's own content (gitignored) — see the Phase 13a report.`);
    process.exit(1);
  }
  assertDevDatabase(allowRemote);
  await connectDatabase();
  try {
    const coach = await User.findOne({ email, roles: 'coach' }).select('_id').lean();
    if (!coach) {
      console.error('No coach with that email.');
      process.exitCode = 1;
      return;
    }
    for (const file of files) {
      const result = await applyNutritionSeed(String(coach._id), await readNutritionSeedFile(file));
      console.log(
        `${path.basename(file)} — food items: ${result.foodsCreated} created, ${result.foodsKept} already there ` +
          `(${result.categoriesFilled} got a category). ` +
          (result.templateCreated === null ? '' : `Template: ${result.templateCreated ? 'created' : 'already there'}.`),
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
