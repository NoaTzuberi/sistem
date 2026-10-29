import type { AiSplitOption, TrainingConfig, VariantId } from '@sistem/types';
import { translate } from '../../../i18n';
import type { PlanProblem } from '../../plans/plan.validation';
import { findCoachLibraryIds } from '../../exercises/exercise.service';
import { checkTrainingIds, findPublishIssues, parseSavePlanPayload } from '../../plans/plan.validation';
import { findSlot, findWorkoutType, patternsFitSlot } from '../../trainingSplits/trainingSplit.service';
import type { FamilyCandidate } from './trainingPlanCandidates';
import type { SplitMenu } from './trainingPlanPrompt';

// Checks a model reply in code. The draft must pass the SAME rules as a plan the coach
// saves and publishes in the dashboard (plan.validation.ts), plus the AI-only rules: split
// options from her config (Phase 12b), the plan follows option 1's day pattern, every exercise
// fills a slot of its workout type with a family that fits it and a variant she can do.
// Every problem is a sentence that names the workout / exercise, so it can be sent back.

const MAX_TEXT = 1000;
const MAX_POINTS = 3;
const UNKNOWN_EXERCISE = 'unknown';

/** Drops undefined keys: a Mixed field would store them as null. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export interface TrainingPlanValidationContext {
  candidates: FamilyCandidate[];
  config: TrainingConfig;
  menu: SplitMenu;
}

/** The stored output (real exercise ids; the coach-only "why" / "focus" kept). */
export interface StoredTrainingPlanExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  restSec?: number;
  supersetGroup?: string;
  why: string;
  /** Phase 12b drafts. */
  slotId?: string;
  familyId?: string;
  variant?: VariantId;
}

export interface StoredTrainingPlanWorkout {
  title: string;
  dayOfWeek?: number;
  focus: string;
  /** Phase 12b drafts. */
  workoutType?: string;
  exercises: StoredTrainingPlanExercise[];
}

export interface StoredTrainingPlan {
  summary: string;
  /** Phase 12 drafts only (the split in words). */
  split?: string;
  considerations: string[];
  workouts: StoredTrainingPlanWorkout[];
  /** Phase 12b drafts. */
  splitId?: string;
  splitOptions?: AiSplitOption[];
  experienceRead?: string;
}

export type TrainingPlanValidationResult = { value: StoredTrainingPlan; issues: [] } | { value: null; issues: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '';
}

function points(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

/** The split options: from the menu, days allowed, as many as asked, the coach's split first. */
function checkSplitOptions(raw: unknown, menu: SplitMenu, issues: string[]): AiSplitOption[] {
  const list = Array.isArray(raw) ? raw.filter(isRecord) : [];
  if (list.length !== menu.optionCount) {
    issues.push(`Return exactly ${menu.optionCount} split option(s); the reply has ${list.length}.`);
  }
  const seen = new Set<string>();
  const options: AiSplitOption[] = [];
  list.forEach((entry, index) => {
    const label = `Split option ${index + 1}`;
    const splitId = typeof entry.splitId === 'string' ? entry.splitId : '';
    const offer = menu.offers.find((candidate) => candidate.splitId === splitId);
    if (!offer) {
      issues.push(`${label}: "${splitId}" is not in the SPLITS list.`);
      return;
    }
    if (seen.has(splitId)) issues.push(`${label}: "${splitId}" is already option ${options.findIndex((o) => o.splitId === splitId) + 1}.`);
    seen.add(splitId);
    const days = entry.daysPerWeek;
    if (typeof days !== 'number' || !offer.days.includes(days)) {
      issues.push(`${label} (${splitId}): daysPerWeek must be one of ${offer.days.join(', ')}.`);
    }
    const pros = points(entry.pros);
    const cons = points(entry.cons);
    if (pros.length < 1 || pros.length > MAX_POINTS) issues.push(`${label} (${splitId}): give 1-${MAX_POINTS} pros.`);
    if (cons.length < 1 || cons.length > MAX_POINTS) issues.push(`${label} (${splitId}): give 1-${MAX_POINTS} cons.`);
    if (!text(entry.why)) issues.push(`${label} (${splitId}): say why it fits her.`);
    options.push({ splitId, daysPerWeek: days as number, why: text(entry.why), pros, cons });
  });
  if (menu.requestedSplitId && options[0]?.splitId !== menu.requestedSplitId) {
    issues.push(`Option 1 must be "${menu.requestedSplitId}" (the coach asked for it).`);
  }
  return options;
}

export async function validateTrainingPlanReply(
  reply: unknown,
  context: TrainingPlanValidationContext,
): Promise<TrainingPlanValidationResult> {
  if (!isRecord(reply) || !Array.isArray(reply.workouts)) {
    return { value: null, issues: ['The reply must be an object with "splitOptions" and "workouts" lists.'] };
  }
  const { config, menu } = context;
  const issues: string[] = [];
  const options = checkSplitOptions(reply.splitOptions, menu, issues);

  const byAlias = new Map(context.candidates.map((candidate) => [candidate.alias, candidate]));
  const rawWorkouts = reply.workouts.filter(isRecord);
  const rawExercises = rawWorkouts.map((workout) => (Array.isArray(workout.exercises) ? workout.exercises.filter(isRecord) : []));

  const workoutLabel = (index: number) => {
    const title = text(rawWorkouts[index]?.title);
    return `Workout ${index + 1}${title ? ` ("${title}")` : ''}`;
  };
  const exerciseLabel = (workoutIndex: number, exerciseIndex: number) => {
    const entry = rawExercises[workoutIndex]?.[exerciseIndex];
    const alias = typeof entry?.exercise === 'string' ? entry.exercise : '?';
    const name = byAlias.get(alias)?.name;
    return `${workoutLabel(workoutIndex)}, exercise ${exerciseIndex + 1} (${alias}${name ? ` ${name}` : ''})`;
  };
  // Sent back to the model: English.
  const describe = (issue: PlanProblem) => {
    const message = translate('en', issue);
    if (issue.workoutIndex === undefined) return message;
    if (issue.exerciseIndex === undefined) return `${workoutLabel(issue.workoutIndex)}: ${message}`;
    return `${exerciseLabel(issue.workoutIndex, issue.exerciseIndex)}: ${message}`;
  };

  // The day pattern of option 1.
  const first = options[0];
  const split = first ? config.splits.find((entry) => entry.id === first.splitId) : undefined;
  const expectedTypes = split && first ? split.days[String(first.daysPerWeek)] : undefined;
  if (expectedTypes) {
    if (rawWorkouts.length !== expectedTypes.length) {
      issues.push(`Plan ${expectedTypes.length} workouts for ${first!.splitId} ${first!.daysPerWeek} days; the reply has ${rawWorkouts.length}.`);
    }
    rawWorkouts.forEach((workout, index) => {
      if (expectedTypes[index] && workout.workoutType !== expectedTypes[index]) {
        issues.push(`${workoutLabel(index)}: workoutType must be "${expectedTypes[index]}" (day ${index + 1} of ${first!.splitId}).`);
      }
    });
  }

  // Families + variants → real exercise ids; slots of the workout type.
  let hasUnknown = false;
  const payloadWorkouts = rawWorkouts.map((workout, workoutIndex) => {
    const workoutType = typeof workout.workoutType === 'string' ? workout.workoutType : undefined;
    const type = workoutType ? findWorkoutType(config, workoutType) : undefined;
    if (!type) {
      hasUnknown = true;
      issues.push(`${workoutLabel(workoutIndex)}: workoutType "${String(workout.workoutType)}" is not a known workout type.`);
    }
    const perSlot = new Map<string, number>();
    const exercises = rawExercises[workoutIndex].map((exercise, exerciseIndex) => {
      const label = exerciseLabel(workoutIndex, exerciseIndex);
      const slotId = typeof exercise.slotId === 'string' ? exercise.slotId : '';
      const slot = type ? findSlot(config, type.id, slotId) : undefined;
      if (type && !slot) issues.push(`${label}: slot "${slotId}" is not a slot of ${type.id}.`);
      if (slot) perSlot.set(slot.id, (perSlot.get(slot.id) ?? 0) + 1);

      const candidate = typeof exercise.exercise === 'string' ? byAlias.get(exercise.exercise) : undefined;
      if (!candidate) {
        hasUnknown = true;
        issues.push(`${label}: this alias is not in the candidate list.`);
      } else if (slot && !patternsFitSlot(candidate.patterns, slot)) {
        issues.push(`${label}: its patterns (${candidate.patterns.join(', ')}) don't fit slot ${slot.id} (${slot.patterns.join(', ')}).`);
      }
      const variant = candidate?.variants.find((entry) => entry.variant === exercise.variant);
      if (candidate && !variant) {
        hasUnknown = true;
        issues.push(`${label}: variant "${String(exercise.variant)}" is not listed for it; use one of ${candidate.variants.map((v) => v.variant).join(', ')}.`);
      }
      return {
        exerciseId: variant?.exerciseId ?? UNKNOWN_EXERCISE,
        slotId: slot?.id,
        familyId: candidate?.familyId,
        variant: variant?.variant,
        sets: exercise.sets,
        reps: exercise.reps,
        // "5–5" is a fixed 5 (models sometimes send the same number twice).
        repsMax: exercise.repsMax === exercise.reps ? null : exercise.repsMax,
        durationSec: exercise.durationSec,
        restSec: exercise.restSec,
        supersetGroup: exercise.supersetGroup,
      };
    });
    if (type) {
      for (const slot of type.slots) {
        const count = perSlot.get(slot.id) ?? 0;
        if (count > slot.maxExercises) issues.push(`${workoutLabel(workoutIndex)}: slot ${slot.id} has ${count} exercises (max ${slot.maxExercises}).`);
      }
    }
    return { title: workout.title, dayOfWeek: workout.dayOfWeek, workoutType: type?.id, exercises };
  });

  // AI-only rules (checked on the reply as sent, so all problems go back in one round).
  const seenDays = new Map<unknown, number>();
  payloadWorkouts.forEach((workout, workoutIndex) => {
    if (Number.isInteger(workout.dayOfWeek)) {
      const earlier = seenDays.get(workout.dayOfWeek);
      if (earlier !== undefined) {
        issues.push(`${workoutLabel(workoutIndex)}: day ${String(workout.dayOfWeek)} is already used by ${workoutLabel(earlier)}.`);
      } else seenDays.set(workout.dayOfWeek, workoutIndex);
    }
    const seenExercises = new Set<string>();
    workout.exercises.forEach((exercise, exerciseIndex) => {
      if (exercise.exerciseId === UNKNOWN_EXERCISE) return;
      if (seenExercises.has(exercise.exerciseId)) {
        issues.push(`${exerciseLabel(workoutIndex, exerciseIndex)}: the same exercise is already in this workout.`);
      }
      seenExercises.add(exercise.exerciseId);
    });
  });
  if (hasUnknown) return { value: null, issues };

  // The dashboard's own rules: what a saved draft and a published plan must satisfy.
  const parsed = parseSavePlanPayload({ workouts: payloadWorkouts, ...(first ? { splitId: first.splitId } : {}) });
  if (!parsed.value) return { value: null, issues: [...parsed.issues.map(describe), ...issues] };
  const workouts = parsed.value.workouts;
  issues.push(...findPublishIssues(workouts).map(describe));
  issues.push(...checkTrainingIds(parsed.value, config).map(describe));

  // Still in the library now (an exercise could have been rejected since it was listed).
  const allIds = [...new Set(workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exerciseId)))];
  const inLibrary = await findCoachLibraryIds(allIds);
  workouts.forEach((workout, workoutIndex) =>
    workout.exercises.forEach((exercise, exerciseIndex) => {
      if (!inLibrary.has(exercise.exerciseId)) {
        issues.push(`${exerciseLabel(workoutIndex, exerciseIndex)}: this exercise is no longer in the library.`);
      }
    }),
  );

  if (issues.length > 0) return { value: null, issues };

  return {
    value: {
      summary: text(reply.summary),
      experienceRead: text(reply.experienceRead) || undefined,
      considerations: points(reply.considerations).slice(0, 12),
      splitId: first!.splitId,
      splitOptions: options,
      workouts: workouts.map((workout, workoutIndex) =>
        compact({
          title: workout.title,
          dayOfWeek: workout.dayOfWeek,
          workoutType: workout.workoutType,
          focus: text(rawWorkouts[workoutIndex].focus),
          exercises: workout.exercises.map((exercise, exerciseIndex) => {
            const raw = rawExercises[workoutIndex][exerciseIndex];
            const sent = payloadWorkouts[workoutIndex].exercises[exerciseIndex];
            return compact({
              exerciseId: exercise.exerciseId,
              slotId: exercise.slotId,
              familyId: sent.familyId,
              variant: sent.variant,
              sets: exercise.sets,
              reps: exercise.reps,
              repsMax: exercise.repsMax,
              durationSec: exercise.durationSec,
              restSec: exercise.restSec,
              supersetGroup: exercise.supersetGroup,
              why: text(raw.why),
            });
          }),
        }),
      ),
    },
    issues: [],
  };
}
