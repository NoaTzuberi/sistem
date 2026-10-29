import { Schema } from 'mongoose';
import { WORKOUT_KIND_IDS, SET_TYPE_IDS, DEFAULT_SET_TYPE, MIN_DAY_OF_WEEK, MAX_DAY_OF_WEEK, SUPERSET_GROUP_PATTERN } from './plan.constants';
import { deriveSetCount, validatePlanExerciseTargets } from './planSets';
import { translate } from '../../i18n';
import { CARDIO_METRIC_IDS, CARDIO_SPORT_IDS } from '../cardio/cardio.constants';
import type { PlanCardioFields, PlanExerciseFields, PlanSetTargetFields, PlanWorkoutFields } from './plan.types';

// Shared by Plan and Template, so a template workout drops straight into a plan.
// Units: weights kg, durations and rest seconds.

const setTargetSchema = new Schema<PlanSetTargetFields>(
  {
    type: { type: String, enum: SET_TYPE_IDS, required: true, default: DEFAULT_SET_TYPE },
    reps: { type: Number, min: 1 },
    repsMax: { type: Number, min: 1 },
    durationSec: { type: Number, min: 1 },
    targetWeight: { type: Number, min: 0 },
    restSec: { type: Number, min: 0 },
  },
  { _id: false },
);

// Keeps its _id: WorkoutLog sets point at it (planExerciseId).
const planExerciseSchema = new Schema<PlanExerciseFields>({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
  // With setTargets, derived from its length (see the hook below).
  sets: { type: Number, required: true, min: 1 },
  reps: { type: Number, min: 1 },
  // Set only for a range, e.g. reps 8 + repsMax 12.
  repsMax: { type: Number, min: 1 },
  // Time-based exercises (planks, carries): reps OR durationSec is required.
  durationSec: { type: Number, min: 1 },
  targetWeight: { type: Number, min: 0 },
  restSec: { type: Number, min: 0 },
  // The coach's notes are the instructions trainees see (library text is not shown).
  notes: { type: String, trim: true },
  supersetGroup: { type: String, trim: true, uppercase: true, match: SUPERSET_GROUP_PATTERN },
  // When present it defines every set (pyramids, drop sets, warm-ups).
  setTargets: { type: [setTargetSchema], default: undefined },
  // Interval mode (HIIT / Tabata): durationSec = work, restSec = rest, sets = rounds.
  // Only for timed sets; a superset is interval as a whole or not at all (publish rule).
  interval: { type: Boolean },
  // Phase 12b (coach-only): the slot of the workout's type it fills — the picker and the AI know
  // what it is for. Checked against the coach's training config on save.
  slotId: { type: String, trim: true },
});

planExerciseSchema.pre('validate', function derivePlanExerciseSets() {
  if (this.setTargets && this.setTargets.length === 0) {
    this.setTargets = undefined;
  }
  const sets = deriveSetCount(this);
  if (sets !== undefined) this.sets = sets;

  const error = validatePlanExerciseTargets(this);
  // A database-level guard (the builder checks first): logs read English.
  if (error) this.invalidate('sets', translate('en', error));
});

// A cardio workout's content. The steps (blocks / repeat sets) are checked in code before every
// save (cardio.validation.ts); Mixed keeps the union as sent.
export const planCardioSchema = new Schema<PlanCardioFields>(
  {
    sport: { type: String, enum: CARDIO_SPORT_IDS, required: true },
    metric: { type: String, enum: CARDIO_METRIC_IDS, required: true },
    steps: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

// Keeps its _id: WorkoutLog.workoutId (and CardioLog.workoutId) point at it, so edits must preserve it.
export const planWorkoutSchema = new Schema<PlanWorkoutFields>({
  title: { type: String, required: true, trim: true },
  dayOfWeek: { type: Number, min: MIN_DAY_OF_WEEK, max: MAX_DAY_OF_WEEK },
  order: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true },
  workoutType: { type: String, trim: true },
  // Coach-only: the type's suggested slots she removed from this workout.
  hiddenSlotIds: { type: [String], default: undefined },
  // Missing = strength (every plan from before cardio).
  kind: { type: String, enum: WORKOUT_KIND_IDS, default: undefined },
  cardio: { type: planCardioSchema, default: undefined },
  exercises: { type: [planExerciseSchema], default: [] },
});
