import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../exercises/__tests__/testDb';
import { startApiTestClient, createTestUser } from '../../../testing/apiTestClient';
import type { ApiTestClient } from '../../../testing/apiTestClient';
import { config } from '../../../config/env';
import { aiClient } from '../../ai/ai.client';
import { AI_CONFIG } from '../../ai/ai.config';
import { AiProviderError } from '../../ai/ai.types';
import type { AiJsonRequest, AiJsonResponse } from '../../ai/ai.types';
import { Exercise } from '../../exercises/exercise.model';
import { Notification } from '../../notifications/notification.model';
import { Plan } from '../../plans/plan.model';
import { currentWeekStart } from '../../plans/planWeek';
import { AiRecommendation } from '../aiRecommendation.model';
import { failInterruptedRecommendations, startRecommendation } from '../aiRecommendation.service';
import { regroupLibrary } from '../../exerciseFamilies/exerciseFamilyGrouping.service';

// Phase 12 (PRD §8): onboarding → a background AI draft for the coach → validated in code,
// retried with its issues → the coach loads it into a plan. The model is always faked.

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const ONBOARDING = {
  name: 'Maya',
  birthDate: '1995-04-12',
  height: 165,
  weight: 60,
  gender: 'female',
  units: { weight: 'kg', distance: 'km' },
  goals: ['build_muscle'],
  trainingFrequency: { minDays: 3, maxDays: 3, flexibleSchedule: false },
  preferredActivities: ['gym_strength_training'],
  exercisePreferences: { favoriteExerciseNotes: 'Hip thrusts. Text me on 054-123-4567', muscleFocus: ['glutes'] },
  equipment: ['full_gym'],
  recovery: { flags: ['has_injury_or_limitation'], notes: 'Old knee injury, email maya@example.com' },
};

/** A small library that covers every slot of the splits on offer (names tag to movement patterns). */
const LIBRARY: [string, string, string][] = [
  ['Barbell Back Squat', 'quadriceps', 'barbell'],
  ['Dumbbell Back Squat', 'quadriceps', 'dumbbell'],
  ['Front Squat', 'quadriceps', 'barbell'],
  ['Goblet Squat', 'quadriceps', 'kettlebell'],
  ['Walking Lunge', 'quadriceps', 'dumbbell'],
  ['Reverse Lunge', 'glutes', 'bodyweight'],
  ['Step-Up', 'quadriceps', 'dumbbell'],
  ['Romanian Deadlift', 'hamstrings', 'barbell'],
  ['Good Morning', 'hamstrings', 'barbell'],
  ['Sumo Deadlift', 'hamstrings', 'barbell'],
  ['Barbell Hip Thrust', 'glutes', 'barbell'],
  ['Glute Bridge', 'glutes', 'bodyweight'],
  ['Barbell Bench Press', 'chest', 'barbell'],
  ['Dumbbell Bench Press', 'chest', 'dumbbell'],
  ['Push-Up', 'chest', 'bodyweight'],
  ['Floor Press', 'chest', 'barbell'],
  ['Cable Fly', 'chest', 'cable'],
  ['Bent-Over Row', 'middle_back', 'barbell'],
  ['Seated Cable Row', 'middle_back', 'cable'],
  ['Inverted Row', 'lats', 'bodyweight'],
  ['Pull-Up', 'lats', 'bodyweight'],
  ['Lat Pulldown', 'lats', 'cable'],
  ['Chin-Up', 'lats', 'bodyweight'],
  ['Overhead Press', 'shoulders', 'barbell'],
  ['Arnold Press', 'shoulders', 'dumbbell'],
  ['Lateral Raise', 'shoulders', 'dumbbell'],
  ['Front Raise', 'shoulders', 'dumbbell'],
  ['Face Pull', 'shoulders', 'cable'],
  ['Reverse Fly', 'shoulders', 'dumbbell'],
  ['Plank', 'abdominals', 'bodyweight'],
  ['Crunch', 'abdominals', 'bodyweight'],
  ['Dead Bug', 'abdominals', 'bodyweight'],
  ['Biceps Curl', 'biceps', 'dumbbell'],
  ['Triceps Pushdown', 'triceps', 'cable'],
  ['Lying Leg Curl', 'hamstrings', 'machine'],
  ['Standing Calf Raise', 'calves', 'machine'],
  ['Glute Kickback', 'glutes', 'cable'],
  ['Hip Abduction', 'abductors', 'machine'],
];

let api: ApiTestClient;
let coach: TestUser;
let otherCoach: TestUser;
let trainee: TestUser;
let generate: MockInstance<typeof aiClient.generateJson>;
let savedKey: string;

async function seedExercises(count = LIBRARY.length) {
  await Exercise.insertMany(
    LIBRARY.slice(0, count).map(([name, muscle, equipment], i) => ({
      slug: `exercise-${i}`,
      name,
      primaryMuscles: [muscle],
      equipment: [equipment],
      difficulty: 'beginner',
      movementType: 'strength',
      source: { provider: 'kaggle', dataset: 'test', importedAt: new Date() },
    })),
  );
  await regroupLibrary();
}

interface PromptFacts {
  candidates: { alias: string; name: string; patterns: string[]; variants: string[] }[];
  splits: { id: string; days: Record<string, string[]> }[];
  slots: Record<string, { id: string; required: boolean; patterns: string[] }[]>;
  optionCount: number;
}

/** What the prompt listed: candidate families, splits with their day patterns, workout-type slots. */
function promptFacts(request: AiJsonRequest): PromptFacts {
  const text = request.messages[0].text;
  const candidates = [...text.matchAll(/^(F\d{3}) \| ([^|]+) \| ([^|]+) \| [^|]+ \| (.+)$/gm)].map((m) => ({
    alias: m[1],
    name: m[2].trim(),
    patterns: m[3].split(',').map((p) => p.trim()),
    variants: m[4].split(',').map((v) => v.trim().split(' ')[0]),
  }));
  const splitBlock = text.split('SPLITS YOU MAY CHOOSE FROM')[1].split('WORKOUT TYPES')[0];
  const splits = [...splitBlock.matchAll(/^([a-z_]+)(?: \(requested by the coach\))? \| (.+)$/gm)].map((m) => ({
    id: m[1],
    days: Object.fromEntries(m[2].split(' · ').map((part) => {
      const [count, types] = part.split(' days: ');
      return [count, types.split(', ')];
    })),
  }));
  const typeBlock = text.split('WORKOUT TYPES AND THEIR SLOTS')[1].split('CANDIDATE EXERCISE FAMILIES')[0];
  const slots: PromptFacts['slots'] = {};
  for (const m of typeBlock.matchAll(/^([a-z_]+): (.+)$/gm)) {
    slots[m[1]] = m[2].split('; ').map((entry) => {
      const parts = entry.match(/^([a-z_]+)(\*?) \[([^\]]+)\]/)!;
      return { id: parts[1], required: parts[2] === '*', patterns: parts[3].split(', ') };
    });
  }
  const optionCount = Number(text.match(/Return (?:exactly )?(\d) split option/)![1]);
  return { candidates, splits, slots, optionCount };
}

/** A reply that passes every rule: option 1's day pattern, every required slot filled from fitting families. */
function validReply(request: AiJsonRequest, splitId = 'full_body', days = 3) {
  const facts = promptFacts(request);
  const types = facts.splits.find((split) => split.id === splitId)!.days[String(days)];
  const others = facts.splits.filter((split) => split.id !== splitId).slice(0, facts.optionCount - 1);
  return {
    summary: 'Three full-body sessions.',
    experienceRead: 'New to structured training.',
    considerations: ['Check the knee before loading squats.'],
    splitOptions: [
      { splitId, daysPerWeek: days, why: 'Fits three days.', pros: ['Simple'], cons: ['Less volume per muscle'] },
      ...others.map((split) => ({
        splitId: split.id,
        daysPerWeek: Number(Object.keys(split.days)[0]),
        why: 'Also fits.',
        pros: ['More focus'],
        cons: ['Harder to recover'],
      })),
    ],
    workouts: types.map((type, w) => {
      const used = new Set<string>();
      return {
        workoutType: type,
        title: `Full body ${w + 1}`,
        dayOfWeek: w * 2,
        focus: 'Whole body strength.',
        exercises: facts.slots[type]
          .filter((slot) => slot.required)
          .map((slot, e) => {
            const candidate = facts.candidates.find((c) => !used.has(c.alias) && c.patterns.some((p) => slot.patterns.includes(p)))!;
            used.add(candidate.alias);
            return {
              slotId: slot.id,
              exercise: candidate.alias,
              variant: candidate.variants[0],
              sets: 3,
              reps: 8,
              repsMax: 12,
              durationSec: null,
              restSec: 90,
              supersetGroup: e >= 4 ? 'A' : null,
              why: `Reason ${candidate.alias}.`,
            };
          }),
      };
    }),
  };
}

function reply(body: unknown, finish: AiJsonResponse['finish'] = 'stop'): AiJsonResponse {
  return { text: JSON.stringify(body), model: 'fake-model', finish, usage: { inputTokens: 100, outputTokens: 50, thinkingTokens: 10 } };
}

async function completeOnboarding(user = trainee) {
  const res = await api.request('POST', '/onboarding/complete', { token: user.token, body: ONBOARDING });
  expect(res.status).toBe(200);
}

async function waitForStatus(traineeId: string, statuses: string[]) {
  for (let i = 0; i < 200; i += 1) {
    const doc = await AiRecommendation.findOne({ traineeId }).sort({ createdAt: -1 }).lean();
    if (doc && statuses.includes(doc.status)) return doc;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No recommendation reached ${statuses.join('/')}`);
}

function latest(traineeId = trainee.id, user = coach) {
  return api.request('GET', `/coach/trainees/${traineeId}/ai-recommendations/latest`, { token: user.token });
}

describe('AI plan recommendations', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await AiRecommendation.init();
    api = await startApiTestClient();
  });

  afterAll(async () => {
    await api.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    savedKey = config.ai.geminiApiKey;
    config.ai.geminiApiKey = 'test-key';
    coach = await createTestUser('coach@example.com', { role: 'coach' });
    otherCoach = await createTestUser('other-coach@example.com', { role: 'coach' });
    trainee = await createTestUser('maya@example.com', { coachId: coach.user._id });
    await seedExercises();
    generate = vi.spyOn(aiClient, 'generateJson').mockImplementation(async (request) => reply(validReply(request)));
  });

  afterEach(() => {
    config.ai.geminiApiKey = savedKey;
    vi.restoreAllMocks();
  });

  it('drafts a plan when onboarding completes, without her name, email or phone', async () => {
    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready', 'failed']);

    expect(doc.status).toBe('ready');
    expect(doc.trigger).toBe('onboarding');
    expect(generate).toHaveBeenCalledTimes(1);

    const request = generate.mock.calls[0][0] as AiJsonRequest;
    const sent = JSON.stringify(request);
    expect(sent).not.toContain('Maya');
    expect(sent).not.toContain('maya@example.com');
    expect(sent).not.toContain('054-123-4567');
    expect(sent).not.toContain('1995');
    expect(sent).not.toContain(trainee.id);
    expect(sent).toContain('Old knee injury, email [email removed]');
    expect(request.system).toContain('personal coach');
    expect(request.messages[0].text).toContain('Return exactly 3 split option(s)');

    const res = await latest();
    expect(res.status).toBe(200);
    expect(res.body.unavailableReason).toBeNull();
    const recommendation = res.body.recommendation;
    expect(recommendation).toMatchObject({ status: 'ready', trigger: 'onboarding', model: 'fake-model', attemptCount: 1, error: null });
    expect(recommendation.input.profile).toMatchObject({ ageYears: expect.any(Number), recoveryFlags: ['has_injury_or_limitation'] });
    expect(recommendation.input.candidates).toBeUndefined();
    expect(recommendation.input.guidanceNote).toBeTruthy(); // no embeddings key in tests
    expect(recommendation.output.summary).toBe('Three full-body sessions.');
    expect(recommendation.output).toMatchObject({ splitId: 'full_body', experienceRead: 'New to structured training.' });
    expect(recommendation.output.splitOptions).toHaveLength(3);
    expect(recommendation.output.splitOptions[0]).toMatchObject({ splitId: 'full_body', daysPerWeek: 3, pros: ['Simple'] });
    expect(recommendation.output.workouts[0].workoutType).toBe('full_body');
    const first = recommendation.output.workouts[0].exercises[0];
    expect(first).toMatchObject({ slotId: 'legs_knee', sets: 3, reps: 8, repsMax: 12, restSec: 90, why: expect.stringMatching(/^Reason F\d{3}\.$/) });
    expect(first).toMatchObject({ familyId: expect.any(String), variant: expect.any(String) });
    expect(first.exercise.familyId).toBe(first.familyId);
    expect(first.exercise.patterns).toEqual(expect.arrayContaining(['squat']));
    expect(first).not.toHaveProperty('targetWeight');
    expect(first).not.toHaveProperty('notes');
  });

  it('returns a timed exercise without null fields (MongoDB stores undefined as null)', async () => {
    generate.mockImplementation(async (request) => {
      const timed = validReply(request);
      Object.assign(timed.workouts[0].exercises[5], { reps: null, repsMax: null, durationSec: 45, supersetGroup: null });
      Object.assign(timed.workouts[0].exercises[0], { reps: 5, repsMax: 5 });
      timed.workouts[0].exercises[4].supersetGroup = null;
      return reply(timed);
    });

    await completeOnboarding();
    await waitForStatus(trainee.id, ['ready']);
    const plank = (await latest()).body.recommendation.output.workouts[0].exercises[5];

    expect(plank).toMatchObject({ sets: 3, durationSec: 45, restSec: 90 });
    expect(plank).not.toHaveProperty('reps');
    expect(plank).not.toHaveProperty('repsMax');
    expect(plank).not.toHaveProperty('supersetGroup');
    const squat = (await latest()).body.recommendation.output.workouts[0].exercises[0];
    expect(squat.reps).toBe(5);
    expect(squat).not.toHaveProperty('repsMax');
  });

  it('sends the issues back and retries until the draft passes the plan rules', async () => {
    generate
      .mockImplementationOnce(async (request) => {
        const bad = validReply(request);
        bad.workouts[0].exercises[0].exercise = 'F199'; // not in this request's list
        bad.workouts[1].exercises[0].supersetGroup = 'B'; // a superset of one
        return reply(bad);
      })
      .mockImplementationOnce(async () => reply({}, 'max_tokens'));

    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready', 'failed']);

    expect(doc.status).toBe('ready');
    expect(doc.attempts).toHaveLength(3);
    expect(doc.attempts[0].issues.join(' ')).toContain('F199');
    expect(doc.attempts[1].issues[0]).toContain('cut off');

    const second = generate.mock.calls[1][0] as AiJsonRequest;
    expect(second.messages).toHaveLength(3);
    expect(second.messages[1].role).toBe('model');
    expect(second.messages[2].text).toContain('F199');
  });

  it('sends text with letters of another writing system back to the model (Hebrew, Latin, digits, punctuation, emoji only)', async () => {
    generate.mockImplementationOnce(async (request) => {
      const bad = validReply(request);
      bad.splitOptions[0].why = 'חלוקה קลาสית לשלושה ימים'; // Thai letters inside a Hebrew word
      return reply(bad);
    });
    generate.mockImplementationOnce(async (request) => {
      const fine = validReply(request);
      fine.summary = 'שלושה אימוני Full body בשבוע — 3 × 45 דק׳, "קלאסי" 💪🏽 (café, 8–12).';
      return reply(fine);
    });

    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready', 'failed']);

    expect(doc.status).toBe('ready');
    expect(doc.attempts).toHaveLength(2);
    expect(doc.attempts[0].issues).toHaveLength(1);
    expect(doc.attempts[0].issues[0]).toContain('splitOptions[0].why');
    expect(doc.attempts[0].issues[0]).toContain('"ลาส"');
    expect((generate.mock.calls[1][0] as AiJsonRequest).messages[2].text).toContain('another writing system');
  });

  it('catches the plan rules the dashboard enforces, and the AI-only rules', async () => {
    generate.mockImplementation(async (request) => {
      const bad = validReply(request);
      bad.workouts.pop(); // full body for 3 days needs 3 workouts
      bad.workouts[1].dayOfWeek = bad.workouts[0].dayOfWeek;
      bad.workouts[0].exercises[1].exercise = bad.workouts[0].exercises[0].exercise;
      bad.workouts[0].exercises[2].reps = 12;
      bad.workouts[0].exercises[2].repsMax = 8;
      return reply(bad);
    });

    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready', 'failed']);

    expect(doc.status).toBe('failed');
    expect(doc.error?.code).toBe('invalid_output');
    expect(doc.attempts).toHaveLength(AI_CONFIG.maxAttempts);
    const issues = doc.attempts[0].issues.join('\n');
    expect(issues).toMatch(/Workout 1 \("Full body 1"\), exercise 3 \(F\d{3} [^)]+\): /);
    expect(issues).toContain('Plan 3 workouts');
    expect(issues).toContain('already used by Workout 1');
    expect(issues).toContain('the same exercise is already in this workout');
  });

  it('checks the split options, the slots and the variants (Phase 12b)', async () => {
    generate.mockImplementation(async (request) => {
      const bad = validReply(request);
      bad.splitOptions = [bad.splitOptions[0], { ...bad.splitOptions[0] }, { splitId: 'bro_split', daysPerWeek: 3, why: 'x', pros: [], cons: ['y'] }];
      bad.splitOptions[0].daysPerWeek = 4;
      bad.workouts[1].workoutType = 'upper';
      bad.workouts[0].exercises[0].variant = 'trap_bar';
      bad.workouts[0].exercises[2].slotId = 'core';
      bad.workouts[2].exercises.splice(5, 1); // the core slot is required
      return reply(bad);
    });

    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready', 'failed']);

    expect(doc.status).toBe('failed');
    const issues = doc.attempts[0].issues.join('\n');
    expect(issues).toContain('daysPerWeek must be one of 3');
    expect(issues).toContain('"full_body" is already option 1');
    expect(issues).toContain('"bro_split" is not in the SPLITS list');
    expect(issues).toContain('workoutType must be "full_body"');
    expect(issues).toContain('variant "trap_bar" is not listed');
    expect(issues).toMatch(/don't fit slot core/);
    expect(issues).toContain('required slot core is empty');
  });

  it('builds the plan for the split the coach asks for, and refuses an unknown split', async () => {
    await completeOnboarding();
    await waitForStatus(trainee.id, ['ready']);
    generate.mockImplementation(async (request) => reply(validReply(request, 'ppl', 3)));

    const path = `/coach/trainees/${trainee.id}/ai-recommendations`;
    expect((await api.request('POST', path, { token: coach.token, body: { type: 'training_plan', splitId: 'bro_split' } })).status).toBe(400);
    expect((await api.request('POST', path, { token: coach.token, body: { type: 'nutrition_plan', splitId: 'ppl' } })).status).toBe(400);
    const started = await api.request('POST', path, { token: coach.token, body: { type: 'training_plan', splitId: 'ppl' } });
    expect(started.status).toBe(202);
    const doc = await waitForStatus(trainee.id, ['ready', 'failed']);

    expect(doc.status).toBe('ready');
    const request = generate.mock.calls.at(-1)![0] as AiJsonRequest;
    expect(request.messages[0].text).toContain('Option 1 must be "ppl"');
    const recommendation = (await latest()).body.recommendation;
    expect(recommendation.input.requestedSplitId).toBe('ppl');
    expect(recommendation.output.splitId).toBe('ppl');
    expect(recommendation.output.workouts.map((workout: { workoutType: string }) => workout.workoutType)).toEqual(['push', 'pull', 'legs']);
  });

  it('marks the draft failed with the provider error (no retry loop on top of the provider)', async () => {
    generate.mockRejectedValue(new AiProviderError('quota_exhausted', 'Daily free quota used.', 'gemini-x'));

    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready', 'failed']);

    expect(doc).toMatchObject({ status: 'failed', active: false, error: { code: 'quota_exhausted', message: 'Daily free quota used.' } });
    expect(generate).toHaveBeenCalledTimes(1);
    expect((await latest()).body.recommendation.error.code).toBe('quota_exhausted');
  });

  it('does not ask the model when too few exercises fit her equipment', async () => {
    await Exercise.deleteMany({});
    await seedExercises(5);

    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['failed']);

    expect(doc.error?.code).toBe('not_enough_data');
    expect(generate).not.toHaveBeenCalled();
  });

  it('runs nothing when the AI is not set up, and says why', async () => {
    config.ai.geminiApiKey = '';

    await completeOnboarding();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await AiRecommendation.countDocuments()).toBe(0);

    const res = await latest();
    expect(res.body).toMatchObject({ recommendation: null, unavailableReason: expect.stringContaining('GEMINI_API_KEY') });
    const post = await api.request('POST', `/coach/trainees/${trainee.id}/ai-recommendations`, {
      token: coach.token,
      body: { type: 'training_plan' },
    });
    expect(post.status).toBe(503);
  });

  it('lets the coach regenerate, one run at a time', async () => {
    await completeOnboarding();
    await waitForStatus(trainee.id, ['ready']);

    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    generate.mockImplementationOnce(async (request) => {
      await held;
      return reply(validReply(request));
    });

    const path = `/coach/trainees/${trainee.id}/ai-recommendations`;
    const first = await api.request('POST', path, { token: coach.token, body: { type: 'training_plan' } });
    expect(first.status).toBe(202);
    expect(first.body.recommendation).toMatchObject({ trigger: 'coach', status: 'pending' });

    await waitForStatus(trainee.id, ['running']);
    const second = await api.request('POST', path, { token: coach.token, body: { type: 'training_plan' } });
    expect(second.status).toBe(409);
    expect(second.body.recommendation.id).toBe(first.body.recommendation.id);

    release();
    await waitForStatus(trainee.id, ['ready']);
    expect(await AiRecommendation.countDocuments({ traineeId: trainee.id })).toBe(2);
    expect((await latest()).body.recommendation.id).toBe(first.body.recommendation.id);

    const bad = await api.request('POST', path, { token: coach.token, body: { type: 'nutrition' } });
    expect(bad.status).toBe(400);
  });

  it('is coach-only: the trainee gets 403, another coach 404', async () => {
    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready']);
    const byId = `/coach/trainees/${trainee.id}/ai-recommendations/${doc._id}`;

    expect((await latest(trainee.id, trainee)).status).toBe(403);
    expect((await api.request('GET', byId, { token: trainee.token })).status).toBe(403);
    expect((await latest(trainee.id, otherCoach)).status).toBe(404);
    expect((await api.request('GET', byId, { token: otherCoach.token })).status).toBe(404);
    expect((await api.request('GET', byId, { token: coach.token })).status).toBe(200);

    // Another of her trainees can't be used to read this one's draft.
    const second = await createTestUser('noa@example.com', { coachId: coach.user._id });
    expect((await api.request('GET', `/coach/trainees/${second.id}/ai-recommendations/${doc._id}`, { token: coach.token })).status).toBe(404);
  });

  it('never reaches the trainee: no notification, no plan, until the coach publishes', async () => {
    await completeOnboarding();
    await waitForStatus(trainee.id, ['ready']);

    expect(await Plan.countDocuments({ traineeId: trainee.id })).toBe(0);
    expect(await Notification.countDocuments({ userId: trainee.id })).toBe(0);
    const plans = await api.request('GET', '/plans', { token: trainee.token });
    expect(plans.body.items).toEqual([]);
  });

  it('links a plan to the draft it was loaded from (coach-only), and checks the link', async () => {
    await completeOnboarding();
    const doc = await waitForStatus(trainee.id, ['ready']);
    const recommendation = (await latest()).body.recommendation;

    const plansPath = `/coach/trainees/${trainee.id}/plans`;
    const created = await api.request('POST', plansPath, { token: coach.token, body: { weekStartDate: currentWeekStart('Asia/Jerusalem') } });
    const planId = created.body.plan.id;
    const workouts = recommendation.output.workouts.map((workout: { title: string; dayOfWeek: number; workoutType: string; exercises: { exerciseId: string; slotId: string; sets: number; reps: number; repsMax: number; restSec: number }[] }) => ({
      title: workout.title,
      dayOfWeek: workout.dayOfWeek,
      workoutType: workout.workoutType,
      exercises: workout.exercises.map(({ exerciseId, slotId, sets, reps, repsMax, restSec }) => ({ exerciseId, slotId, sets, reps, repsMax, restSec })),
    }));

    const saved = await api.request('PUT', `${plansPath}/${planId}`, {
      token: coach.token,
      body: { workouts, aiRecommendationId: String(doc._id) },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.plan.aiRecommendationId).toBe(String(doc._id));
    expect(saved.body.plan.workouts[0]).toMatchObject({ workoutType: 'full_body' });
    expect(saved.body.plan.workouts[0].exercises[0].slotId).toBe('legs_knee');

    // Omitted keeps the link; the trainee's own plan view never shows it.
    const kept = await api.request('PUT', `${plansPath}/${planId}`, { token: coach.token, body: { workouts } });
    expect(kept.body.plan.aiRecommendationId).toBe(String(doc._id));
    await api.request('POST', `${plansPath}/${planId}/publish`, { token: coach.token });
    const hers = await api.request('GET', '/plans', { token: trainee.token });
    expect(hers.body.items).toHaveLength(1);
    expect(hers.body.items[0]).not.toHaveProperty('aiRecommendationId');
    expect(JSON.stringify(hers.body)).not.toContain('Reason F');
    // Workout types and slots are coach-only too.
    expect(hers.body.items[0].workouts[0]).not.toHaveProperty('workoutType');
    expect(hers.body.items[0].workouts[0].exercises[0]).not.toHaveProperty('slotId');

    // Someone else's recommendation can't be linked; null clears.
    const other = await createTestUser('noa@example.com', { coachId: coach.user._id });
    const foreign = await AiRecommendation.create({
      traineeId: other.id, coachId: coach.id, type: 'training_plan', status: 'ready', trigger: 'coach', active: false,
    });
    const refused = await api.request('PUT', `${plansPath}/${planId}`, {
      token: coach.token,
      body: { workouts, aiRecommendationId: String(foreign._id) },
    });
    expect(refused.status).toBe(400);
    expect(refused.body.issues[0].message).toContain('AI recommendation');
    const cleared = await api.request('PUT', `${plansPath}/${planId}`, { token: coach.token, body: { workouts, aiRecommendationId: null } });
    expect(cleared.body.plan).not.toHaveProperty('aiRecommendationId');
  });

  it('marks drafts left running by a stopped server as failed', async () => {
    generate.mockImplementation(() => new Promise(() => {}));
    await completeOnboarding();
    await waitForStatus(trainee.id, ['running']);
    // A second start while one is active returns that one.
    const again = await startRecommendation({ traineeId: trainee.id, coachId: coach.id, coachingId: trainee.coachingId!, type: 'training_plan', trigger: 'coach' });
    expect(again.created).toBe(false);

    expect(await failInterruptedRecommendations()).toBe(1);
    const doc = await AiRecommendation.findOne({ traineeId: trainee.id }).lean();
    expect(doc).toMatchObject({ status: 'failed', active: false, error: { code: 'interrupted' } });
  });
});
