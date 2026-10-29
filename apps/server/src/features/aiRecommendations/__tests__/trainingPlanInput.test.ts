import { describe, it, expect } from 'vitest';
import type { AiTraineeProfile, PatternId } from '@sistem/types';
import { ageInYears, buildKnowledgeQuery, buildTraineeProfile, scrubFreeText } from '../trainingPlan/trainingPlanProfile';
import { accessForProfile, aliasFor, allowedEquipment, selectFamilyCandidates } from '../trainingPlan/trainingPlanCandidates';
import type { FamilyPoolEntry } from '../trainingPlan/trainingPlanCandidates';
import { buildSplitMenu, neededPatterns } from '../trainingPlan/trainingPlanSplits';
import { mergeTrainingConfig } from '../../trainingSplits/trainingSplit.service';
import { buildTrainingPlanSchema, buildTrainingPlanUserMessage } from '../trainingPlan/trainingPlanPrompt';
import { FREE_TEXT_MAX_LENGTH, MAX_CANDIDATES } from '../trainingPlan/trainingPlan.constants';

// Phase 12 / 12b: what the model is told about a trainee (minimized), which exercise families it may
// choose from (chosen in code), and which splits.

const NOW = new Date('2026-10-07T12:00:00Z');

function profile(overrides: Partial<AiTraineeProfile> = {}): AiTraineeProfile {
  return {
    goals: ['build_muscle'],
    trainingDays: { min: 3, max: 4, flexible: true },
    preferredActivities: [],
    muscleFocus: [],
    equipment: ['full_gym'],
    recoveryFlags: [],
    notes: {},
    ...overrides,
  };
}

let nextId = 0;
/** A family with one barbell primary she can do (none when `variants` is []). */
function family(name: string, patterns: PatternId[], variants = ['barbell']): FamilyPoolEntry {
  nextId += 1;
  return {
    familyId: `family${nextId}`,
    name,
    patterns,
    muscles: ['quadriceps'],
    movementType: 'strength',
    variants: variants.map((variant, i) => ({
      variant: variant as FamilyPoolEntry['variants'][number]['variant'],
      exerciseId: `ex${nextId}-${i}`,
      name: `${variant} ${name}`,
      difficulty: 'beginner',
      equipment: [variant],
    })),
  };
}

describe('scrubFreeText', () => {
  it('removes emails and phone numbers', () => {
    expect(scrubFreeText('Write me at maya.t@example.com or call 054-123-4567')).toBe(
      'Write me at [email removed] or call [phone removed]',
    );
    expect(scrubFreeText('+972 54 123 4567 anytime')).toBe('[phone removed] anytime');
  });

  it('keeps training numbers', () => {
    const text = 'Did 3x10 squats at 60-80 kg in 2019, knee hurt after 12.5 km';
    expect(scrubFreeText(text)).toBe(text);
  });

  it('trims to the limit and drops empty text', () => {
    const long = 'a'.repeat(FREE_TEXT_MAX_LENGTH + 50);
    expect(scrubFreeText(long)).toHaveLength(FREE_TEXT_MAX_LENGTH + 1);
    expect(scrubFreeText(long)?.endsWith('…')).toBe(true);
    expect(scrubFreeText('   ')).toBeUndefined();
    expect(scrubFreeText(undefined)).toBeUndefined();
  });
});

describe('buildTraineeProfile', () => {
  it('sends age (not the birth date), rounded numbers and ids — never a name or email', () => {
    const result = buildTraineeProfile(
      {
        birthDate: new Date('1995-10-08T00:00:00Z'),
        height: 165.4,
        weight: 60.6,
        gender: 'female',
        goals: ['build_muscle'],
        trainingFrequency: { minDays: 3, maxDays: 4, flexibleSchedule: true },
        preferredActivities: ['pilates'],
        exercisePreferences: { favoriteExerciseNotes: 'Hip thrusts, mail maya@x.io', muscleFocus: ['glutes'] },
        equipment: ['full_gym'],
        recovery: { flags: ['nothing_to_add'], notes: '  ' },
      },
      NOW,
    );

    expect(result).toEqual({
      ageYears: 30, // her birthday is tomorrow
      heightCm: 165,
      weightKg: 61,
      gender: 'female',
      goals: ['build_muscle'],
      trainingDays: { min: 3, max: 4, flexible: true },
      preferredActivities: ['pilates'],
      muscleFocus: ['glutes'],
      equipment: ['full_gym'],
      recoveryFlags: [],
      notes: { favoriteExercises: 'Hip thrusts, mail [email removed]', exercisesToImprove: undefined, recovery: undefined },
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('1995');
    expect(json).not.toContain('@');
  });

  it('computes age on the birthday', () => {
    expect(ageInYears(new Date('1995-10-07T00:00:00Z'), NOW)).toBe(31);
  });

  it('builds the knowledge search from answer ids only (no free text to the embeddings provider)', () => {
    const query = buildKnowledgeQuery(
      profile({ recoveryFlags: ['has_injury_or_limitation'], notes: { recovery: 'my left knee hurts' } }),
    );
    expect(query).toContain('build muscle');
    expect(query).toContain('Training 3-4 days a week');
    expect(query).toContain('has injury or limitation');
    expect(query).not.toContain('knee');
  });
});

describe('candidate selection (exercise families, Phase 12b)', () => {
  it('maps her equipment answer to the library, and bodyweight is always allowed', () => {
    expect([...allowedEquipment(profile({ equipment: ['dumbbells'] }))].sort()).toEqual(['bodyweight', 'dumbbell', 'no_equipment']);
    expect(allowedEquipment(profile({ equipment: ['full_gym'] })).has('machine')).toBe(true);
    expect([...allowedEquipment(profile({ equipment: ['bodyweight_only', 'bench'] }))].sort()).toEqual(['bodyweight', 'no_equipment']);
  });

  it('offers advanced exercises only to an experienced trainee', () => {
    expect(accessForProfile(profile()).levels).toEqual(['beginner', 'intermediate']);
    expect(accessForProfile(profile({ experience: 'new' })).levels).toEqual(['beginner', 'intermediate']);
    expect(accessForProfile(profile({ experience: 'experienced' })).levels).toEqual(['beginner', 'intermediate', 'advanced']);
  });

  it('picks per needed pattern, focus patterns get more, the coach\'s picks first, plain names before branded', () => {
    const squats = Array.from({ length: 15 }, (_, i) => family(`Squat variation ${String(i).padStart(2, '0')}`, ['squat']));
    const branded = family('FYR2 Banded Squat Pulse', ['squat']);
    const coachPick = family('Zercher squat with a very long name that ranks last otherwise', ['squat']);
    const presses = Array.from({ length: 15 }, (_, i) => family(`Press ${i}`, ['horizontal_push']));
    const rows = Array.from({ length: 15 }, (_, i) => family(`Row ${i}`, ['horizontal_pull']));
    const pool = [...squats, branded, coachPick, ...presses, ...rows];

    const picked = selectFamilyCandidates(pool, ['squat', 'horizontal_push'], profile({ muscleFocus: ['legs'] }), new Set([coachPick.familyId]));
    const squatPicks = picked.filter((c) => c.patterns.includes('squat'));
    expect(squatPicks).toHaveLength(10);
    expect(squatPicks[0].name).toBe(coachPick.name);
    expect(squatPicks.map((c) => c.name)).not.toContain(branded.name);
    expect(picked.filter((c) => c.patterns.includes('horizontal_push'))).toHaveLength(6);
    // A pattern no slot asks for is not offered.
    expect(picked.some((c) => c.patterns.includes('horizontal_pull'))).toBe(false);
    expect(picked.map((c) => c.alias)).toEqual(picked.map((_, i) => aliasFor(i)));
  });

  it('skips families without a variant she can do, and plyometrics when she prefers low impact', () => {
    const pool = [family('Box Jump', ['power']), family('Barbell Squat', ['squat'], []), family('Goblet Squat', ['squat'])];
    const names = selectFamilyCandidates(pool, ['squat', 'power'], profile({ recoveryFlags: ['prefers_low_impact'] }), new Set()).map((c) => c.name);
    expect(names).toEqual(['Goblet Squat']);
  });

  it('never offers more aliases than the schema allows', () => {
    const patterns = ['squat', 'lunge', 'hinge', 'horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull', 'core'] as const;
    const pool = patterns.flatMap((pattern) => Array.from({ length: 40 }, (_, i) => family(`${pattern} ${i}`, [pattern])));
    const picked = selectFamilyCandidates(pool, [...patterns], profile({ muscleFocus: ['legs', 'back', 'arms', 'chest', 'shoulders', 'core', 'glutes'] }), new Set());
    expect(picked.length).toBeLessThanOrEqual(MAX_CANDIDATES);
  });
});

describe('split menu', () => {
  const config = mergeTrainingConfig(null);

  it('offers the splits that fit her days, at most 3 options', () => {
    const menu = buildSplitMenu(config, { min: 3, max: 3 });
    expect(menu.ok && menu.value.optionCount).toBe(3);
    expect(menu.ok && menu.value.offers.map((offer) => offer.splitId)).toContain('ppl');
    const two = buildSplitMenu(config, { min: 2, max: 2 });
    expect(two.ok && two.value.offers.map((offer) => offer.splitId).sort()).toEqual(['full_body', 'upper_lower']);
    expect(two.ok && two.value.optionCount).toBe(2);
    const five = buildSplitMenu(config, { min: 5, max: 5 });
    expect(five.ok && five.value).toMatchObject({ optionCount: 1, offers: [{ splitId: 'ppl_upper_lower', days: [5] }] });
  });

  it('caps 7 days at 6 and puts the split the coach asked for first, with its nearest day count', () => {
    const seven = buildSplitMenu(config, { min: 7, max: 7 });
    expect(seven.ok && seven.value.offers.map((offer) => offer.splitId).sort()).toEqual(['abc', 'abc_glute', 'ppl']);
    const requested = buildSplitMenu(config, { min: 2, max: 2 }, 'ppl');
    expect(requested.ok && requested.value).toMatchObject({ requestedSplitId: 'ppl', optionCount: 3 });
    expect(requested.ok && requested.value.offers[0]).toEqual({ splitId: 'ppl', days: [3] });
    expect(buildSplitMenu(config, { min: 2, max: 2 }, 'nope')).toMatchObject({ ok: false, message: { code: 'ai_split_unknown' } });
  });

  it('says why when no split fits', () => {
    const none = mergeTrainingConfig({ splits: { full_body: { enabled: false }, upper_lower: { enabled: false } } });
    expect(buildSplitMenu(none, { min: 1, max: 2 })).toMatchObject({ ok: false, message: { code: 'ai_split_none_fits' } });
  });

  it('asks for the patterns of every slot of the offered splits, in slot order', () => {
    const menu = buildSplitMenu(config, { min: 2, max: 2 });
    const patterns = menu.ok ? neededPatterns(config, menu.value) : [];
    expect(patterns.slice(0, 3)).toEqual(['squat', 'lunge', 'hinge']);
    expect(patterns).toContain('calf_raise');
    expect(patterns).not.toContain('mobility');
  });
});

describe('prompt', () => {
  it('lists families by alias with their variants, the splits and slots, and fixed / config enums', () => {
    const config = mergeTrainingConfig(null);
    const menu = { offers: [{ splitId: 'full_body', days: [3] }], optionCount: 1 };
    const candidates = [{ ...family('Back Squat', ['squat']), alias: 'F001' }];
    const message = buildTrainingPlanUserMessage(profile(), [], candidates, config, menu);
    expect(message).toContain('F001 | Back Squat | squat | quadriceps | barbell (beginner)');
    expect(message).toContain('full_body | 3 days: full_body, full_body, full_body');
    expect(message).toContain('full_body: legs_knee [squat, lunge] max 2');
    expect(message).toContain('Return exactly 1 split option(s)');
    expect(message).toContain('(none available)');

    const schema = JSON.stringify(buildTrainingPlanSchema(config));
    expect(schema).toContain('"F001"');
    expect(schema).toContain('"F200"');
    expect(schema).not.toContain('"F201"');
    expect(schema).toContain('"upper_lower_glute"');
    expect(schema).toContain('"smith_machine"');
    expect(schema).not.toContain('targetWeight');
    expect(schema).not.toContain('notes');
    // Gemini answers 400 to minItems / maxItems on the nested arrays.
    expect(schema).not.toContain('minItems');
    expect(schema).not.toContain('maxItems');
  });
});
