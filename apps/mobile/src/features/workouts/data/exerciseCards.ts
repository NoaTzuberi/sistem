import type { PlanExercise } from '@sistem/types';

// The workout detail's exercise cards: one card per exercise, a superset (the same supersetGroup next to
// each other) shares one card. `number` counts exercises in plan order (01, 02…), across supersets.

export interface ExerciseCardItem {
  exercise: PlanExercise;
  number: number;
}

export interface ExerciseCardGroup {
  /** The superset's letter ('A'), null for a single exercise. */
  superset: string | null;
  items: ExerciseCardItem[];
}

export function groupExerciseCards(exercises: PlanExercise[]): ExerciseCardGroup[] {
  const groups: ExerciseCardGroup[] = [];
  exercises.forEach((exercise, index) => {
    const item = { exercise, number: index + 1 };
    const last = groups[groups.length - 1];
    if (exercise.supersetGroup && last?.superset === exercise.supersetGroup) last.items.push(item);
    else groups.push({ superset: exercise.supersetGroup ?? null, items: [item] });
  });
  return groups;
}

/** 01, 02 … 10 — the card's index. */
export function cardNumber(number: number): string {
  return String(number).padStart(2, '0');
}
