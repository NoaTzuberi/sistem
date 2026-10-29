import type { ExerciseFacts, PlanCardio, SetType } from '@sistem/types';

// The plan as it is being edited. Every item has a client `key` (stable across
// renders, drags and saves); `id` appears once the server has stored the item.

export interface DraftTargets {
  reps?: number;
  repsMax?: number;
  durationSec?: number;
  targetWeight?: number;
  restSec?: number;
}

export interface DraftSetTarget extends DraftTargets {
  key: string;
  type: SetType;
}

/** Whether the simple (same for every set) row counts reps or seconds. */
export type TargetMode = 'reps' | 'time';

export interface DraftExercise extends DraftTargets {
  key: string;
  id?: string;
  exerciseId: string;
  facts?: ExerciseFacts;
  mode: TargetMode;
  sets?: number;
  notes: string;
  /** '' = not in a superset */
  supersetGroup: string;
  /** null = simple mode; a list = one row per set (pyramids, warm-ups, drop sets). */
  setTargets: DraftSetTarget[] | null;
  /** Interval mode (HIIT / Tabata) — timed sets only; a superset is all interval or none. */
  interval: boolean;
  /** Phase 12b: the slot of the workout's type it fills; undefined = "Other". */
  slotId?: string;
}

export interface DraftWorkout {
  key: string;
  id?: string;
  title: string;
  dayOfWeek?: number;
  notes: string;
  /** Phase 12b: the workout type (slot template); undefined = free workout. */
  workoutType?: string;
  /** The type's suggested slots the coach removed from this workout (× on an empty slot). */
  hiddenSlotIds?: string[];
  /** undefined = strength. A cardio workout has no exercises; its blocks are in `cardio`. */
  kind?: 'cardio';
  cardio?: PlanCardio;
  exercises: DraftExercise[];
}

export interface PlanDraft {
  notes: string;
  workouts: DraftWorkout[];
  /** The AI recommendation the workouts were loaded from (its rationale shows beside the plan). */
  aiRecommendationId?: string;
  /** Phase 12b: the split the plan follows. */
  splitId?: string;
}

/** "Use split only" (Phase 12b, router state from the Plans tab): build the plan's workouts from this split. */
export interface SplitOnlyRequest {
  splitId: string;
  daysPerWeek: number;
  /** The AI draft it came from: linked for the rationale, its picks offered as slot suggestions. */
  recommendationId?: string;
}

/** The keys of a draft in payload order — to match a save response back to it. */
export type DraftKeys = { key: string; exercises: string[] }[];
