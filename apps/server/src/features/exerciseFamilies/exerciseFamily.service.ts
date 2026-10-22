import { Types } from 'mongoose';
import type {
  ExerciseFamilyDetail,
  ExerciseFamilySearchResult,
  ExerciseFamilySummary,
  ExerciseVariantSummary,
  FamilyHistory,
  FamilyReviewReason,
  PatternId,
  UpdateExerciseFamilyPayload,
  VariantId,
} from '@sistem/types';
import { LocalizedError } from '../../i18n';
import type { Difficulty, Equipment } from '../exercises/exercise.constants';
import { Exercise } from '../exercises/exercise.model';
import { scoreText } from '../exercises/exerciseSearch';
import { PersonalRecord } from '../personalRecords/personalRecord.model';
import { Plan } from '../plans/plan.model';
import { findSlot, getEffectiveTrainingConfig } from '../trainingSplits/trainingSplit.service';
import { exerciseAllowed, loadTraineeExerciseAccess, type TraineeExerciseAccess } from '../trainingSplits/traineeExerciseAccess';
import { findLastPerformance } from '../workoutLogs/workoutSession.service';
import { VARIANT_IDS } from './exerciseFamily.constants';
import { ExerciseFamily, type ExerciseFamilyFields } from './exerciseFamily.model';
import { familyDisplayName, plainNameRank } from './exerciseFamilyGrouping';
import { refreshFamilyMembers } from './exerciseFamilyGrouping.service';
import { WorkoutLog } from '../workoutLogs/workoutLog.model';

// The coach's view of the library by family (Phase 12b): the slot-filtered picker, the library
// review screen and her edits (name, patterns, primary, merge, split). Only primaries are offered
// in the picker and to the AI; copies stay reachable through the family's detail.

export class FamilyNotFoundError extends LocalizedError {}
export class FamilyRequestError extends LocalizedError {}

const LIBRARY_FILTER: Record<string, unknown> = { isActive: true, reviewStatus: { $ne: 'rejected' } };
const DEFAULT_LIMIT = 30;
export const MAX_LIMIT = 500;
const RECENT_LIMIT = 8;
/** Recent plans scanned for "Recently used". */
const RECENT_PLAN_SCAN = 30;

type LeanFamily = ExerciseFamilyFields & { _id: Types.ObjectId };
interface LeanMember {
  _id: Types.ObjectId;
  name: string;
  equipment: string[];
  difficulty: string;
  familyId?: Types.ObjectId;
  variant?: VariantId;
  isPrimaryVariant?: boolean;
}

const MEMBER_FIELDS = 'name equipment difficulty familyId variant isPrimaryVariant';

function variantOrder(variant: VariantId | undefined): number {
  const index = VARIANT_IDS.indexOf(variant ?? 'other');
  return index < 0 ? VARIANT_IDS.length : index;
}

function toVariant(member: LeanMember, access?: TraineeExerciseAccess): ExerciseVariantSummary {
  return {
    exerciseId: String(member._id),
    variant: member.variant ?? 'other',
    name: member.name,
    equipment: member.equipment,
    difficulty: member.difficulty,
    isPrimary: Boolean(member.isPrimaryVariant),
    ...(access ? { allowed: exerciseAllowed(member, access) } : {}),
  };
}

function toSummary(family: LeanFamily, members: LeanMember[], access?: TraineeExerciseAccess): ExerciseFamilySummary {
  const primaries = members
    .filter((member) => member.isPrimaryVariant)
    .sort((a, b) => variantOrder(a.variant) - variantOrder(b.variant));
  return {
    id: String(family._id),
    name: family.name,
    muscles: family.muscles,
    movementType: family.movementType,
    patterns: family.patterns as PatternId[],
    levels: family.levels,
    variants: primaries.map((member) => toVariant(member, access)),
    copyCount: members.length - primaries.length,
    reviewReasons: family.reviewReasons as FamilyReviewReason[],
    reviewedAt: family.reviewedAt ? family.reviewedAt.toISOString() : null,
    source: family.source,
    patternSource: family.patternSource,
  };
}

async function membersByFamily(familyIds: Types.ObjectId[]): Promise<Map<string, LeanMember[]>> {
  const members = await Exercise.find({ ...LIBRARY_FILTER, familyId: { $in: familyIds } })
    .select(MEMBER_FIELDS)
    .lean<LeanMember[]>();
  const map = new Map<string, LeanMember[]>();
  for (const member of members) {
    const id = String(member.familyId);
    map.set(id, [...(map.get(id) ?? []), member]);
  }
  return map;
}

export interface FamilySearchInput {
  search?: string;
  workoutType?: string;
  slotId?: string;
  patterns?: PatternId[];
  traineeId?: string;
  equipmentOnly?: boolean;
  levels?: Difficulty[];
  review?: 'needed' | 'unclear' | 'reviewed';
  page?: number;
  limit?: number;
}

/** Families the coach used, newest plan first (her "Recently used"). */
async function recentFamilyIds(coachId: string): Promise<string[]> {
  const plans = await Plan.find({ coachId }).sort({ updatedAt: -1 }).limit(RECENT_PLAN_SCAN).select('workouts.exercises.exerciseId').lean();
  const exerciseIds = [...new Set(plans.flatMap((plan) => plan.workouts.flatMap((workout) => workout.exercises.map((exercise) => String(exercise.exerciseId)))))];
  if (exerciseIds.length === 0) return [];
  const docs = await Exercise.find({ _id: { $in: exerciseIds } }).select('familyId').lean();
  const familyOf = new Map(docs.map((doc) => [String(doc._id), doc.familyId ? String(doc.familyId) : null]));
  const ordered: string[] = [];
  for (const id of exerciseIds) {
    const familyId = familyOf.get(id);
    if (familyId && !ordered.includes(familyId)) ordered.push(familyId);
  }
  return ordered;
}

export async function searchFamilies(coachId: string, input: FamilySearchInput): Promise<ExerciseFamilySearchResult> {
  const page = input.page ?? 1;
  const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  let patterns = input.patterns && input.patterns.length > 0 ? input.patterns : undefined;
  if (input.workoutType || input.slotId) {
    const slot = input.workoutType && input.slotId ? findSlot(await getEffectiveTrainingConfig(coachId), input.workoutType, input.slotId) : undefined;
    if (!slot) throw new FamilyRequestError('family_slot_unknown');
    // Chips narrow inside the slot; a chip outside it is ignored.
    patterns = patterns ? slot.patterns.filter((pattern) => patterns!.includes(pattern)) : slot.patterns;
    if (patterns.length === 0) patterns = slot.patterns;
  }

  const filter: Record<string, unknown> = {};
  if (patterns) filter.patterns = { $in: patterns };
  // A slot never offers a combo the coach hasn't checked yet (its patterns are a guess).
  if (input.slotId) filter.$nor = [{ reviewReasons: 'unclear_pattern', reviewedAt: null }];
  if (input.review === 'needed') Object.assign(filter, { 'reviewReasons.0': { $exists: true }, reviewedAt: null });
  if (input.review === 'unclear') filter.patterns = { $size: 0 };
  if (input.review === 'reviewed') filter.reviewedAt = { $ne: null };

  const families = await ExerciseFamily.find(filter).sort({ name: 1 }).lean<LeanFamily[]>();
  const members = await membersByFamily(families.map((family) => family._id));
  const traineeAccess = input.traineeId ? await loadTraineeExerciseAccess(input.traineeId) : undefined;
  const levels = input.levels && input.levels.length > 0 ? input.levels : traineeAccess?.levels;
  // Her equipment, at the levels on screen (the coach may widen them).
  const access = traineeAccess && levels ? { ...traineeAccess, levels } : traineeAccess;
  const equipmentOnly = access ? input.equipmentOnly !== false : false;
  const offered = (member: LeanMember) =>
    (!levels || levels.includes(member.difficulty as Difficulty)) &&
    (!equipmentOnly || !access || member.equipment.every((item) => access.equipment.has(item as Equipment)));

  const passes = families.filter((family) =>
    (members.get(String(family._id)) ?? []).some((member) => member.isPrimaryVariant && offered(member)),
  );

  // Plain names first ("Seated Row" before "180 Jump to Renegade Side Raise"), then A–Z.
  let ordered = [...passes].sort((a, b) => plainNameRank(a.name) - plainNameRank(b.name) || a.name.localeCompare(b.name));
  const search = input.search?.trim();
  if (search) {
    ordered = passes
      .map((family) => {
        const names = (members.get(String(family._id)) ?? []).map((member) => member.name);
        const score = Math.max(scoreText(search, family.name), ...names.map((name) => scoreText(search, name) * 0.9));
        return { family, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.family.name.localeCompare(b.family.name))
      .map((entry) => entry.family);
  }

  const summaries = (list: LeanFamily[]) => list.map((family) => toSummary(family, members.get(String(family._id)) ?? [], access));
  const recentIds = await recentFamilyIds(coachId);
  const byId = new Map(passes.map((family) => [String(family._id), family]));
  const recent = recentIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])).slice(0, RECENT_LIMIT);

  return {
    items: summaries(ordered.slice((page - 1) * limit, page * limit)),
    page,
    limit,
    total: ordered.length,
    totalPages: Math.ceil(ordered.length / limit),
    recent: summaries(recent),
  };
}

async function loadFamily(familyId: string): Promise<LeanFamily> {
  const family = Types.ObjectId.isValid(familyId) ? await ExerciseFamily.findById(familyId).lean<LeanFamily>() : null;
  if (!family) throw new FamilyNotFoundError('family_not_found');
  return family;
}

export async function getFamilyDetail(familyId: string, traineeId?: string): Promise<ExerciseFamilyDetail> {
  const family = await loadFamily(familyId);
  const members = (await membersByFamily([family._id])).get(String(family._id)) ?? [];
  const access = traineeId ? await loadTraineeExerciseAccess(traineeId) : undefined;
  return {
    ...toSummary(family, members, access),
    members: members
      .sort((a, b) => variantOrder(a.variant) - variantOrder(b.variant) || Number(b.isPrimaryVariant) - Number(a.isPrimaryVariant) || a.name.localeCompare(b.name))
      .map((member) => toVariant(member, access)),
  };
}

export async function updateFamily(familyId: string, payload: UpdateExerciseFamilyPayload): Promise<ExerciseFamilyDetail> {
  await loadFamily(familyId);
  const set: Record<string, unknown> = {};
  if (payload.name !== undefined) Object.assign(set, { name: payload.name, source: 'coach' });
  if (payload.patterns !== undefined) Object.assign(set, { patterns: payload.patterns, patternSource: 'coach' });
  if (payload.reviewed !== undefined) set.reviewedAt = payload.reviewed ? new Date() : null;
  await ExerciseFamily.updateOne({ _id: familyId }, { $set: set });
  return getFamilyDetail(familyId);
}

/** The exercise becomes its variant's primary (and stays so on every re-run). */
export async function setFamilyPrimary(familyId: string, exerciseId: string): Promise<ExerciseFamilyDetail> {
  const family = await loadFamily(familyId);
  const exercise = Types.ObjectId.isValid(exerciseId)
    ? await Exercise.findOne({ _id: exerciseId, familyId: family._id, ...LIBRARY_FILTER }).select('variant').lean()
    : null;
  if (!exercise) throw new FamilyRequestError('family_exercise_not_member');
  const sameVariant = await Exercise.find({ familyId: family._id, variant: exercise.variant }).select('_id').lean();
  const others = new Set(sameVariant.map((doc) => String(doc._id)));
  const kept = family.coachPrimaryIds.filter((id) => !others.has(String(id)));
  await ExerciseFamily.updateOne({ _id: family._id }, { $set: { coachPrimaryIds: [new Types.ObjectId(exerciseId), ...kept] } });
  await refreshFamilyMembers(family._id);
  return getFamilyDetail(familyId);
}

/** Moves every exercise of `sourceId` into `targetId` (the coach's call — never undone by a re-run). */
export async function mergeFamilies(targetId: string, sourceId: string): Promise<ExerciseFamilyDetail> {
  if (targetId === sourceId) throw new FamilyRequestError('family_merge_same');
  const [target, source] = await Promise.all([loadFamily(targetId), loadFamily(sourceId)]);
  await Exercise.updateMany({ familyId: source._id }, { $set: { familyId: target._id, familySource: 'coach' } });
  // The target's own exercises are pinned too: a re-run must not pull them out of the merge.
  await Exercise.updateMany({ familyId: target._id }, { $set: { familySource: 'coach' } });
  await ExerciseFamily.updateOne(
    { _id: target._id },
    {
      $set: {
        source: 'coach',
        muscles: [...new Set([...target.muscles, ...source.muscles])].sort(),
        patterns: [...new Set([...target.patterns, ...source.patterns])],
      },
      $addToSet: { coachPrimaryIds: { $each: source.coachPrimaryIds } },
    },
  );
  await ExerciseFamily.deleteOne({ _id: source._id });
  await refreshFamilyMembers(target._id);
  return getFamilyDetail(targetId);
}

/** The chosen exercises leave into a new family of their own; both stay as the coach set them. */
export async function splitFamily(familyId: string, exerciseIds: string[]): Promise<ExerciseFamilyDetail> {
  const family = await loadFamily(familyId);
  const members = await Exercise.find({ familyId: family._id, ...LIBRARY_FILTER }).select('name').lean();
  const chosen = members.filter((member) => exerciseIds.includes(String(member._id)));
  if (chosen.length === 0 || chosen.length !== new Set(exerciseIds).size || chosen.length === members.length) {
    throw new FamilyRequestError('family_split_invalid');
  }
  const newId = new Types.ObjectId();
  await ExerciseFamily.create({
    _id: newId,
    key: `coach:${String(newId)}`,
    name: familyDisplayName(chosen[0].name),
    muscles: family.muscles,
    movementType: family.movementType,
    patterns: family.patterns,
    source: 'coach',
    patternSource: family.patternSource,
    levels: family.levels,
    reviewReasons: [],
    reviewedAt: new Date(),
    coachPrimaryIds: family.coachPrimaryIds.filter((id) => exerciseIds.includes(String(id))),
  });
  await Exercise.updateMany({ _id: { $in: chosen.map((member) => member._id) } }, { $set: { familyId: newId, familySource: 'coach' } });
  await Exercise.updateMany({ familyId: family._id }, { $set: { familySource: 'coach' } });
  await ExerciseFamily.updateOne({ _id: family._id }, { $set: { source: 'coach' } });
  await Promise.all([refreshFamilyMembers(family._id), refreshFamilyMembers(newId)]);
  return getFamilyDetail(String(newId));
}

/**
 * Her history per variant of one family — PRs and "last time" stay per variant (40 kg barbell ≠ dumbbells).
 * Coach view: only the logs (and PRs set in logs) of this coach's coaching with her.
 */
export async function getFamilyHistory(traineeId: string, coachingId: string, familyId: string): Promise<FamilyHistory> {
  const family = await loadFamily(familyId);
  const members = await Exercise.find({ familyId: family._id }).select(MEMBER_FIELDS).lean<LeanMember[]>();
  const ids = members.map((member) => String(member._id));
  const logIds = (await WorkoutLog.distinct('_id', { traineeId, coachingId })) as Types.ObjectId[];
  const [last, records] = await Promise.all([
    findLastPerformance(traineeId, ids, undefined, coachingId),
    PersonalRecord.find({ userId: traineeId, exerciseId: { $in: ids }, logId: { $in: logIds } }).sort({ date: -1 }).lean(),
  ]);
  const variants = members
    .map((member) => {
      const id = String(member._id);
      const record = records.find((entry) => String(entry.exerciseId) === id);
      return {
        exerciseId: id,
        variant: member.variant ?? ('other' as VariantId),
        name: member.name,
        last: last[id] ?? null,
        best: record
          ? { type: record.type, value: record.newValue, ...(record.weight !== undefined ? { weight: record.weight } : {}), date: record.date.toISOString() }
          : null,
      };
    })
    // Only what she has done, newest first.
    .filter((entry) => entry.last || entry.best)
    .sort((a, b) => (b.last?.finishedAt ?? '').localeCompare(a.last?.finishedAt ?? ''));
  return { familyId: String(family._id), variants };
}
