import { Types } from 'mongoose';
import type { ExerciseFacts, StartFreeWorkoutPayload, WorkoutSession } from '@sistem/types';
import { Exercise } from '../exercises/exercise.model';
import { getExerciseFactsByIds } from '../exercises/exercise.service';
import { scoreExercise } from '../exercises/exerciseSearch';
import { ExerciseFamily } from '../exerciseFamilies/exerciseFamily.model';
import { plainNameRank } from '../exerciseFamilies/exerciseFamilyGrouping';
import { MUSCLE_FOCUS_TO_PATTERNS } from '../aiRecommendations/trainingPlan/trainingPlan.constants';
import { exerciseAllowed, loadTraineeExerciseAccess } from '../trainingSplits/traineeExerciseAccess';
import type { TraineeExerciseAccess } from '../trainingSplits/traineeExerciseAccess';
import { LocalizedError } from '../../i18n';
import { WorkoutLog } from './workoutLog.model';
import { WorkoutLogNotFoundError } from './workoutLog.service';
import type { WorkoutLogSetFields } from './workoutLog.types';
import { OtherWorkoutActiveError, assertActive, findLastPerformance, findOwnLog, toActiveRef, toSession } from './workoutSession.service';
import type { LeanWorkoutLog } from './workoutSession.service';
import {
  FREE_EXERCISE_DEFAULT_REPS,
  FREE_EXERCISE_DEFAULT_SETS,
  FREE_WORKOUT_MAX_EXERCISES,
  FREE_WORKOUT_MUSCLE_EXERCISES,
  MAX_SETS_PER_EXERCISE,
} from './workoutLog.constants';

// Free workouts ("אימון חופשי"): a workout she builds herself, outside any coach's plan. The log is
// trainee-owned (source 'free', no plan, no coaching) and keeps its own exercise list; everything
// after the start (sets, finish, PRs, summary, Daily Pump) is the normal session flow.

export class FreeWorkoutError extends LocalizedError {}

const DUPLICATE_KEY_ERROR = 11000;
/** The same library as the coach's picker: imported, active, not rejected — primaries only. */
const LIBRARY_FILTER: Record<string, unknown> = { isActive: true, reviewStatus: { $ne: 'rejected' }, isPrimaryVariant: true };
const SEARCH_LIMIT = 30;

interface LibraryDoc {
  _id: Types.ObjectId;
  name: string;
  aliases: string[];
  equipment: string[];
  difficulty: string;
  familyId?: Types.ObjectId;
}

/** The sets a newly added exercise starts with: 3 × 10, weight = what she lifted last time. */
function defaultSets(exerciseId: Types.ObjectId, entryId: Types.ObjectId, lastWeight: number | undefined): WorkoutLogSetFields[] {
  return Array.from({ length: FREE_EXERCISE_DEFAULT_SETS }, (_, setIndex) => ({
    exerciseId,
    planExerciseId: entryId,
    setIndex,
    type: 'working' as const,
    reps: FREE_EXERCISE_DEFAULT_REPS,
    ...(lastWeight !== undefined && { weight: lastWeight }),
    completed: false,
  }));
}

/** "Repeat": the exercises of one of her completed logs, in order, with what she did then as targets. */
async function setsFromLog(traineeId: string, fromLogId: string) {
  if (!Types.ObjectId.isValid(fromLogId)) throw new WorkoutLogNotFoundError('workout_log_not_found');
  const source = await WorkoutLog.findOne({ _id: fromLogId, traineeId, status: 'completed' }).lean<LeanWorkoutLog>();
  if (!source) throw new WorkoutLogNotFoundError('workout_log_not_found');
  const order: string[] = [];
  for (const set of source.sets) if (!order.includes(String(set.exerciseId))) order.push(String(set.exerciseId));

  const freeExercises = order.slice(0, FREE_WORKOUT_MAX_EXERCISES).map((exerciseId) => ({ _id: new Types.ObjectId(), exerciseId: new Types.ObjectId(exerciseId) }));
  const sets = freeExercises.flatMap((entry) =>
    source.sets
      .filter((set) => String(set.exerciseId) === String(entry.exerciseId))
      .slice(0, MAX_SETS_PER_EXERCISE)
      .map((set, setIndex) => ({
        exerciseId: entry.exerciseId,
        planExerciseId: entry._id,
        setIndex,
        type: set.type ?? ('working' as const),
        ...(set.reps !== undefined && { reps: set.reps }),
        ...(set.weight !== undefined && { weight: set.weight }),
        ...(set.durationSec !== undefined && { durationSec: set.durationSec }),
        completed: false,
      })),
  );
  return { title: source.workoutTitle, freeExercises, sets };
}

/** The patterns her muscle choice trains; full body = every major one. */
function patternsFor(muscles: string[]): string[][] {
  const chosen = muscles.includes('full_body') ? ['legs', 'back', 'chest', 'glutes', 'shoulders', 'core'] : muscles;
  return chosen.map((muscle) => MUSCLE_FOCUS_TO_PATTERNS[muscle] ?? []).filter((patterns) => patterns.length > 0);
}

/**
 * "By muscle": up to 5 exercises, taking turns between the muscles she picked and one movement
 * pattern at a time, each the plain-named primary of a reviewed family that fits her equipment
 * and level (same rules as the coach's slot picker).
 */
async function pickByMuscles(muscles: string[], access: TraineeExerciseAccess): Promise<Types.ObjectId[]> {
  const groups = patternsFor(muscles);
  const allPatterns = [...new Set(groups.flat())];
  if (allPatterns.length === 0) throw new FreeWorkoutError('free_workout_muscles_required');

  const familyFilter: Record<string, unknown> = {
    patterns: { $in: allPatterns },
    $nor: [{ reviewReasons: 'unclear_pattern', reviewedAt: null }],
  };
  const families = await ExerciseFamily.find(familyFilter)
    .select('name patterns')
    .lean();
  const primaries = await Exercise.find({ ...LIBRARY_FILTER, familyId: { $in: families.map((family) => family._id) } })
    .select('equipment difficulty familyId')
    .lean<LibraryDoc[]>();
  const primaryOf = new Map(primaries.filter((doc) => exerciseAllowed(doc, access)).map((doc) => [String(doc.familyId), doc._id]));
  const byPattern = new Map<string, Types.ObjectId[]>();
  for (const family of [...families].sort((a, b) => plainNameRank(a.name) - plainNameRank(b.name) || a.name.localeCompare(b.name))) {
    const exerciseId = primaryOf.get(String(family._id));
    if (!exerciseId) continue;
    for (const pattern of family.patterns) byPattern.set(pattern, [...(byPattern.get(pattern) ?? []), exerciseId]);
  }

  const picked: Types.ObjectId[] = [];
  const has = (id: Types.ObjectId) => picked.some((existing) => existing.equals(id));
  const cursor = groups.map(() => 0);
  for (let round = 0; picked.length < FREE_WORKOUT_MUSCLE_EXERCISES && round < 12; round += 1) {
    groups.forEach((patterns, index) => {
      if (picked.length >= FREE_WORKOUT_MUSCLE_EXERCISES) return;
      const pattern = patterns[cursor[index] % patterns.length];
      cursor[index] += 1;
      const next = (byPattern.get(pattern) ?? []).find((id) => !has(id));
      if (next) picked.push(next);
    });
  }
  if (picked.length === 0) throw new FreeWorkoutError('free_workout_no_exercises');
  return picked;
}

export async function startFreeWorkout(
  traineeId: string,
  payload: StartFreeWorkoutPayload,
  title: string,
  now: Date = new Date(),
): Promise<{ session: WorkoutSession; resumed: boolean }> {
  const active = await WorkoutLog.findOne({ traineeId, status: 'in_progress' }).lean<LeanWorkoutLog>();
  if (active) throw new OtherWorkoutActiveError(toActiveRef(active));

  let workoutTitle = title;
  let freeExercises: { _id: Types.ObjectId; exerciseId: Types.ObjectId }[] = [];
  let sets: WorkoutLogSetFields[] = [];
  if (payload.mode === 'repeat') {
    ({ title: workoutTitle, freeExercises, sets } = await setsFromLog(traineeId, payload.fromLogId));
  } else if (payload.mode === 'muscle') {
    const exerciseIds = await pickByMuscles(payload.muscles, await loadTraineeExerciseAccess(traineeId));
    const last = await findLastPerformance(traineeId, exerciseIds.map(String));
    freeExercises = exerciseIds.map((exerciseId) => ({ _id: new Types.ObjectId(), exerciseId }));
    sets = freeExercises.flatMap((entry) => defaultSets(entry.exerciseId, entry._id, last[String(entry.exerciseId)]?.weight));
  }

  try {
    const created = await WorkoutLog.create({ traineeId, source: 'free', workoutTitle, startedAt: now, freeExercises, sets });
    return { session: await toSession(created.toObject() as LeanWorkoutLog, now), resumed: false };
  } catch (error) {
    // Another device started a workout at the same moment: the unique index let only one through.
    if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) {
      const other = await WorkoutLog.findOne({ traineeId, status: 'in_progress' }).lean<LeanWorkoutLog>();
      if (other) throw new OtherWorkoutActiveError(toActiveRef(other));
    }
    throw error;
  }
}

/** Adds one library exercise (3 working sets) to her open free workout. */
export async function addFreeExercise(logId: string, traineeId: string, exerciseId: string, now: Date = new Date()): Promise<WorkoutSession> {
  const log = await assertActive(logId, traineeId);
  if (log.source !== 'free') throw new FreeWorkoutError('free_workout_only');
  if ((log.freeExercises ?? []).length >= FREE_WORKOUT_MAX_EXERCISES) throw new FreeWorkoutError('free_workout_too_many');
  if (!Types.ObjectId.isValid(exerciseId)) throw new FreeWorkoutError('exercise_not_found');
  const exercise = await Exercise.findOne({ _id: exerciseId, isActive: true, reviewStatus: { $ne: 'rejected' } }).select('_id').lean();
  if (!exercise) throw new FreeWorkoutError('exercise_not_found');

  const entryId = new Types.ObjectId();
  const last = await findLastPerformance(traineeId, [exerciseId]);
  const result = await WorkoutLog.updateOne(
    { _id: log._id, status: 'in_progress' },
    {
      $push: {
        freeExercises: { _id: entryId, exerciseId: exercise._id },
        sets: { $each: defaultSets(exercise._id, entryId, last[exerciseId]?.weight) },
      },
    },
    { runValidators: true },
  );
  if (result.matchedCount === 0) throw new FreeWorkoutError('workout_not_in_progress');
  return toSession(await findOwnLog(logId, traineeId), now);
}

/**
 * The trainee's exercise picker for a free workout: primaries only, her equipment and level, facts
 * only (names are never translated). Empty search = plain names A–Z.
 */
export async function searchFreeExercises(traineeId: string, search: string): Promise<ExerciseFacts[]> {
  const [access, docs] = await Promise.all([
    loadTraineeExerciseAccess(traineeId),
    Exercise.find(LIBRARY_FILTER).select('name aliases equipment difficulty').lean<LibraryDoc[]>(),
  ]);
  const allowed = docs.filter((doc) => exerciseAllowed(doc, access));
  const query = search.trim();
  const ordered = query
    ? allowed
        .map((doc) => ({ doc, score: scoreExercise(query, doc.name, doc.aliases ?? []) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.doc.name.localeCompare(b.doc.name))
        .map((entry) => entry.doc)
    : [...allowed].sort((a, b) => plainNameRank(a.name) - plainNameRank(b.name) || a.name.localeCompare(b.name));
  const ids = ordered.slice(0, SEARCH_LIMIT).map((doc) => String(doc._id));
  const facts = await getExerciseFactsByIds(ids);
  return ids.flatMap((id) => (facts.get(id) ? [facts.get(id)!] : []));
}
