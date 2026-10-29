import type { PatternId, SplitConfig, TrainingSlot, WorkoutTypeConfig } from '@sistem/types';

// THE training config defaults (Phase 12b, PRD §8 v2): workout types with their exercise slots,
// and the weekly splits made of them. Per-coach overrides live in TrainingSettings and are merged
// by getEffectiveTrainingConfig(); her settings screen comes later (backlog). Labels of every id
// are in @sistem/shared copy (trainingCopy) — never here. The AI may only answer with these ids.

/** Days a week a plan never goes past: one rest day. */
export const MAX_TRAINING_DAYS = 6;
/** Default per slot: one main pick and one alternative / extra. */
export const DEFAULT_MAX_EXERCISES_PER_SLOT = 2;

// A slot is a suggestion (owner, 2026-10-28): none is required, the coach adds, removes and fills
// them freely. maxExercises only guides the AI draft.
function slot(id: string, patterns: PatternId[], maxExercises = DEFAULT_MAX_EXERCISES_PER_SLOT): TrainingSlot {
  return { id, patterns, maxExercises };
}

const LEGS_SLOTS: TrainingSlot[] = [
  slot('squat', ['squat']),
  slot('hinge', ['hinge']),
  slot('single_leg', ['lunge']),
  slot('glutes', ['glute_bridge', 'glute_isolation', 'hip_abduction']),
  slot('hamstrings', ['knee_flexion']),
  slot('quads', ['knee_extension']),
  slot('calves', ['calf_raise']),
];

export const DEFAULT_WORKOUT_TYPES: WorkoutTypeConfig[] = [
  {
    id: 'full_body',
    slots: [
      slot('legs_knee', ['squat', 'lunge']),
      slot('legs_hip', ['hinge', 'glute_bridge']),
      slot('chest', ['horizontal_push', 'chest_fly']),
      slot('back', ['horizontal_pull', 'vertical_pull']),
      slot('shoulders', ['vertical_push', 'shoulder_raise', 'rear_delt']),
      slot('core', ['core']),
      slot('finisher', ['conditioning', 'carry', 'power']),
    ],
  },
  {
    id: 'upper',
    slots: [
      slot('horizontal_push', ['horizontal_push']),
      slot('horizontal_pull', ['horizontal_pull']),
      slot('vertical_push', ['vertical_push']),
      slot('vertical_pull', ['vertical_pull']),
      slot('shoulder_isolation', ['shoulder_raise', 'rear_delt']),
      slot('biceps', ['elbow_flexion']),
      slot('triceps', ['elbow_extension']),
    ],
  },
  {
    id: 'lower',
    slots: [
      slot('squat', ['squat']),
      slot('hinge', ['hinge']),
      slot('single_leg', ['lunge']),
      slot('glutes', ['glute_bridge', 'glute_isolation', 'hip_abduction']),
      slot('hamstrings', ['knee_flexion']),
      slot('calves', ['calf_raise']),
      slot('core', ['core']),
    ],
  },
  {
    id: 'lower_glute',
    slots: [
      slot('glute_bridge', ['glute_bridge']),
      slot('hinge', ['hinge']),
      slot('single_leg', ['lunge']),
      slot('glute_isolation', ['glute_isolation']),
      slot('hip_abduction', ['hip_abduction']),
      slot('hamstrings', ['knee_flexion']),
    ],
  },
  {
    id: 'push',
    slots: [
      slot('chest_press', ['horizontal_push']),
      slot('shoulder_press', ['vertical_push']),
      slot('chest_fly', ['chest_fly']),
      slot('side_delts', ['shoulder_raise']),
      slot('triceps', ['elbow_extension']),
    ],
  },
  {
    id: 'pull',
    slots: [
      slot('vertical_pull', ['vertical_pull']),
      slot('horizontal_pull', ['horizontal_pull']),
      slot('rear_delts', ['rear_delt']),
      slot('biceps', ['elbow_flexion']),
      slot('traps', ['shrug']),
      slot('core', ['core']),
    ],
  },
  { id: 'legs', slots: LEGS_SLOTS },
  // ABC as the owner defined it for now (2026-10-09) — the coach confirms what ABC means to her
  // (docs/reference/abc-split-question.md).
  {
    id: 'abc_a',
    coachToConfirm: true,
    slots: [
      slot('horizontal_push', ['horizontal_push']),
      slot('horizontal_pull', ['horizontal_pull']),
      slot('vertical_pull', ['vertical_pull']),
      slot('chest_fly', ['chest_fly']),
      slot('core', ['core']),
    ],
  },
  { id: 'abc_b', coachToConfirm: true, slots: LEGS_SLOTS.map((legsSlot) => ({ ...legsSlot })) },
  {
    id: 'abc_c',
    coachToConfirm: true,
    slots: [
      slot('vertical_push', ['vertical_push']),
      slot('side_delts', ['shoulder_raise']),
      slot('rear_delts', ['rear_delt']),
      slot('biceps', ['elbow_flexion']),
      slot('triceps', ['elbow_extension']),
      slot('core', ['core']),
    ],
  },
];

const repeat = (types: string[], times: number) => Array.from({ length: times }, () => types).flat();

export const DEFAULT_SPLITS: SplitConfig[] = [
  {
    id: 'full_body',
    enabled: true,
    days: { 1: ['full_body'], 2: repeat(['full_body'], 2), 3: repeat(['full_body'], 3), 4: repeat(['full_body'], 4) },
  },
  { id: 'upper_lower', enabled: true, days: { 2: ['upper', 'lower'], 4: repeat(['upper', 'lower'], 2) } },
  { id: 'upper_lower_full', enabled: true, days: { 3: ['upper', 'lower', 'full_body'] } },
  {
    id: 'upper_lower_glute',
    enabled: true,
    days: { 3: ['lower', 'upper', 'lower_glute'], 4: ['upper', 'lower', 'upper', 'lower_glute'] },
  },
  { id: 'ppl', enabled: true, days: { 3: ['push', 'pull', 'legs'], 6: repeat(['push', 'pull', 'legs'], 2) } },
  { id: 'ppl_upper_lower', enabled: true, days: { 5: ['push', 'pull', 'legs', 'upper', 'lower'] } },
  {
    id: 'abc',
    enabled: true,
    coachToConfirm: true,
    days: { 3: ['abc_a', 'abc_b', 'abc_c'], 6: repeat(['abc_a', 'abc_b', 'abc_c'], 2) },
  },
  {
    id: 'abc_glute',
    enabled: true,
    coachToConfirm: true,
    days: { 3: ['abc_a', 'lower_glute', 'abc_c'], 6: ['abc_a', 'abc_b', 'abc_c', 'abc_a', 'lower_glute', 'abc_c'] },
  },
];
