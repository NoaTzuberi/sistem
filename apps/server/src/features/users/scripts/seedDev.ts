/**
 * DEV ONLY: creates one coach and two trainees with completed onboarding.
 * Trainee 1 lands on the waiting screen; trainee 2 also gets a published plan for
 * the current week (so the app opens on Home) that shows the plan features:
 * a rep range, a superset, a time-based exercise and per-set targets, and about three
 * months of weigh-ins and measurements (Phase 10 body tracking — no photos).
 *
 *   npm run seed:dev                   (local database)
 *   npm run seed:dev -- --allow-remote (non-local dev database)
 *
 * SEED_PASSWORD=<your own> gives the NEW accounts that password instead of the built-in dev one,
 * which is public (it is in this file). Always set it for a database a public server uses
 * (docs/deploy/render.md); it is never printed.
 *
 * Also seeds the coach's food list when its data file (apps/server/data/nutrition/food-lists.json,
 * made from the coach's md lists in docs/reference/, gitignored) exists — see seed:nutrition.
 *
 * Re-running is safe: existing seed accounts, plans and body entries are left as they are
 * (body entries are added to an existing trainee 2 once, if she has at most one).
 * Same database guard as promote:coach.
 */
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import type { Types } from 'mongoose';
import type { OnboardingAnswersPayload } from '@sistem/types';
import { connectDatabase } from '../../../config/database';
import { User } from '../user.model';
import { DEFAULT_TIMEZONE } from '../users.constants';
import { ensureCoachSetup } from '../../coachProfiles/coachProfile.service';
import { startCoaching } from '../../coachings/coaching.service';
import { getPrimaryCommunityId, joinCommunity } from '../../communities/community.service';
import { hasRole } from '../user.model';
import { completeOnboarding } from '../../onboarding/onboarding.service';
import { validateCompleteOnboardingPayload } from '../../onboarding/onboarding.validation';
import { Plan } from '../../plans/plan.model';
import { addDays, currentWeekStart, localDateString } from '../../plans/planWeek';
import { BodyMetric } from '../../bodyMetrics/bodyMetric.model';
import type { PlanSetTargetFields } from '../../plans/plan.types';
import { Exercise } from '../../exercises/exercise.model';
import { assertDevDatabase } from './devDatabaseGuard';
import { DEV_SEED_PASSWORD } from './devSeed.constants';
import { existsSync } from 'node:fs';
import { NUTRITION_SEED_FILES, applyNutritionSeed, readNutritionSeedFile } from '../../nutrition/nutritionSeed';

const MIN_OWN_PASSWORD_LENGTH = 12;
const OWN_SEED_PASSWORD = process.env.SEED_PASSWORD ?? '';
const SEED_PASSWORD = OWN_SEED_PASSWORD || DEV_SEED_PASSWORD;
const SALT_ROUNDS = 12;

const COACH = { name: 'Dev Coach', email: 'coach@sistem.dev' };

const TRAINEES: {
  name: string;
  email: string;
  withPlan: boolean;
  withBodyMetrics?: boolean;
  onboarding: OnboardingAnswersPayload;
}[] = [
  {
    name: 'Dev Trainee One',
    email: 'trainee1@sistem.dev',
    withPlan: false,
    onboarding: {
      birthDate: '1995-04-12',
      height: 165,
      weight: 60,
      gender: 'female',
      units: { weight: 'kg', distance: 'km' },
      goals: ['build_muscle', 'increase_strength'],
      trainingFrequency: { minDays: 3, maxDays: 4, flexibleSchedule: true },
      preferredActivities: ['gym_strength_training', 'pilates'],
      exercisePreferences: { favoriteExerciseNotes: 'Hip thrusts', muscleFocus: ['glutes', 'legs'] },
      equipment: ['full_gym'],
      recovery: { flags: ['nothing_to_add'] },
      nutritionPreferences: { dietType: 'none', dietStyles: [], religious: [], intolerances: [], allergies: [], mealsPerDay: null },
    },
  },
  {
    name: 'Dev Trainee Two',
    email: 'trainee2@sistem.dev',
    withPlan: true,
    withBodyMetrics: true,
    onboarding: {
      birthDate: '1990-09-30',
      height: 170,
      weight: 68,
      gender: 'female',
      units: { weight: 'kg', distance: 'km' },
      goals: ['lose_weight', 'improve_endurance'],
      trainingFrequency: { minDays: 2, maxDays: 3, flexibleSchedule: false },
      preferredActivities: ['running', 'functional_training'],
      exercisePreferences: { muscleFocus: ['core', 'full_body'] },
      equipment: ['dumbbells', 'resistance_bands'],
      recovery: { flags: ['prefers_low_impact'], notes: 'Knees get sore on long runs.' },
      nutritionPreferences: {
        dietType: 'vegetarian',
        dietStyles: [],
        religious: [{ id: 'kosher' }],
        intolerances: [{ id: 'lactose_free', details: 'Lactose ok in yogurt.' }],
        allergies: [{ id: 'tree_nuts' }],
        foodsDisliked: 'Mushrooms.',
        mealsPerDay: 4,
      },
      weightGoal: { targetWeight: 62, timeframe: { kind: 'weeks', weeks: 12 } },
    },
  },
];

async function findOrCreateUser(name: string, email: string, fields: Record<string, unknown>) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  exists   ${email} (${existing.roles.join(', ')}) — left unchanged`);
    return { user: existing, created: false };
  }
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, timezone: DEFAULT_TIMEZONE, ...fields });
  console.log(`  created  ${email} (${user.roles.join(', ')})`);
  return { user, created: true };
}

async function seedPlan(traineeId: Types.ObjectId, coachId: Types.ObjectId, coachingId: Types.ObjectId, timezone: string) {
  const weekStartDate = currentWeekStart(timezone);
  if (await Plan.exists({ coachingId, weekStartDate })) {
    console.log(`  exists   plan for week ${weekStartDate} — left unchanged`);
    return;
  }

  const exercises = await Exercise.find({ isActive: true }).sort({ name: 1 }).limit(4).select('_id').lean();
  if (exercises.length < 4) {
    console.warn('  note     fewer than 4 exercises in the library — run `npm run import:exercises` for a full plan.');
  }
  const [first, second, third, fourth] = exercises.map((exercise) => exercise._id);

  const lowerBody = [
    // Per-set targets: a warm-up, a pyramid and a drop set (sets is derived: 4).
    first && {
      exerciseId: first,
      sets: 4,
      notes: 'Slow on the way down, full range.',
      setTargets: [
        { type: 'warmup', reps: 12, targetWeight: 20, restSec: 60 },
        { type: 'working', reps: 10, targetWeight: 40, restSec: 90 },
        { type: 'working', reps: 8, targetWeight: 45, restSec: 90 },
        { type: 'drop', reps: 12, targetWeight: 30 },
      ] satisfies PlanSetTargetFields[],
    },
    // A superset: A1 + A2 back to back, with a rep range.
    second && { exerciseId: second, sets: 3, reps: 8, repsMax: 12, targetWeight: 12, restSec: 0, supersetGroup: 'A' },
    third && { exerciseId: third, sets: 3, reps: 10, restSec: 75, supersetGroup: 'A' },
  ].filter(Boolean);

  const core = [
    // Time-based: 3 × 45 s.
    fourth && { exerciseId: fourth, sets: 3, durationSec: 45, restSec: 30, notes: 'Keep your hips level.' },
  ].filter(Boolean);

  await Plan.create({
    traineeId,
    coachId,
    coachingId,
    weekStartDate,
    status: 'published',
    publishedAt: new Date(),
    notes: 'Seed plan (DEV).',
    workouts: [
      { title: 'Lower Body', dayOfWeek: 0, order: 0, exercises: lowerBody },
      { title: 'Core & Conditioning', dayOfWeek: 3, order: 1, exercises: core },
    ],
  });
  console.log(`  created  published plan for week ${weekStartDate}`);
}

// kg every ~9 days (oldest first), and measurements (cm) on some of those days.
const SEED_WEIGHTS = [70.4, 70.1, 70.3, 69.6, 69.4, 69.0, 69.2, 68.7, 68.3, 68.5, 67.9, 67.6];
const SEED_MEASUREMENTS: Record<number, Record<string, number>> = {
  0: { chest: 92, waist: 76, hips: 101, arms: 30, thighs: 58 },
  4: { chest: 91, waist: 74.5, hips: 100, arms: 30, thighs: 57.5 },
  8: { chest: 90.5, waist: 73, hips: 99, arms: 29.5, thighs: 57 },
  11: { chest: 90, waist: 72, hips: 98.5, arms: 29.5, thighs: 56.5 },
};

async function seedBodyMetrics(traineeId: Types.ObjectId, timezone: string) {
  if ((await BodyMetric.countDocuments({ traineeId })) > 1) {
    console.log('  exists   body entries — left unchanged');
    return;
  }
  const today = localDateString(new Date(), timezone);
  let added = 0;
  for (const [index, weight] of SEED_WEIGHTS.entries()) {
    // Ends yesterday, so today's onboarding weigh-in is left alone.
    const date = addDays(today, -1 - (SEED_WEIGHTS.length - 1 - index) * 9);
    if (await BodyMetric.exists({ traineeId, date })) continue;
    await BodyMetric.create({ traineeId, date, weight, measurements: SEED_MEASUREMENTS[index] });
    added += 1;
  }
  console.log(`  created  ${added} body entries (weight + measurements)`);
}

async function main() {
  const allowRemote = process.argv.slice(2).includes('--allow-remote');
  assertDevDatabase(allowRemote);
  if (OWN_SEED_PASSWORD && OWN_SEED_PASSWORD.length < MIN_OWN_PASSWORD_LENGTH) {
    console.error(`SEED_PASSWORD must be at least ${MIN_OWN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  await connectDatabase();
  try {
    console.log('Coach:');
    const { user: coach } = await findOrCreateUser(COACH.name, COACH.email, { roles: ['coach'] });
    if (!hasRole(coach, 'coach')) {
      console.error(`${COACH.email} exists but is not a coach — stopping.`);
      process.exitCode = 1;
      return;
    }
    // Her profile + primary community (idempotent).
    await ensureCoachSetup(coach._id, coach.name);
    const communityId = await getPrimaryCommunityId(coach._id);

    console.log('Trainees:');
    for (const trainee of TRAINEES) {
      const { user, created } = await findOrCreateUser(trainee.name, trainee.email, {});
      if (!hasRole(user, 'trainee')) continue;
      if (trainee.withBodyMetrics) await seedBodyMetrics(user._id, user.timezone);
      if (!created) continue;
      // As if she joined through the coach's link: a coaching + her primary community.
      const { coaching } = await startCoaching(user._id, coach._id);
      if (communityId) await joinCommunity(user._id, communityId);

      const payload = { name: trainee.name, ...trainee.onboarding };
      const validationError = validateCompleteOnboardingPayload(payload);
      if (validationError) throw new Error(`Seed onboarding for ${trainee.email} is invalid: ${validationError}`);
      await completeOnboarding(String(user._id), payload);
      console.log('           onboarding completed');

      if (trainee.withPlan) {
        await seedPlan(user._id, coach._id, coaching._id, user.timezone);
      }
    }

    // The coach's food lists + template (Phase 13a / 13a+), when her data is on this machine.
    const nutritionFiles = NUTRITION_SEED_FILES.filter((file) => existsSync(file));
    if (nutritionFiles.length === 0) console.log('Nutrition: no food list data file (apps/server/data/nutrition/) — skipped.');
    for (const file of nutritionFiles) {
      const result = await applyNutritionSeed(String(coach._id), await readNutritionSeedFile(file));
      console.log(`Nutrition (${file.split('/').pop()}): ${result.foodsCreated} food item(s) created.`);
    }


    console.log(
      OWN_SEED_PASSWORD
        ? '\nPassword for every NEW seed account: the SEED_PASSWORD you gave (existing accounts keep theirs).'
        : `\nPassword for every seed account: ${SEED_PASSWORD}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
