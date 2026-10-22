import type { PlanExercise, PlanWorkout } from '@sistem/types';
import { getExerciseFactsByIds } from '../exercises/exercise.service';
import type { WorkoutLogDocument } from './workoutLog.types';

// The session screen reads a PlanWorkout. A free workout has none, so one is built from the log
// itself: its exercise list + the sets it holds (the "plan" of a free workout is what she logs).

type FreeLog = Pick<WorkoutLogDocument, 'workoutTitle' | 'freeExercises' | 'sets'> & { _id: unknown };

export async function freeSessionWorkout(log: FreeLog): Promise<PlanWorkout> {
  const entries = log.freeExercises ?? [];
  const facts = await getExerciseFactsByIds(entries.map((entry) => String(entry.exerciseId)));
  const exercises: PlanExercise[] = entries.map((entry) => {
    const id = String(entry._id);
    const sets = log.sets.filter((set) => String(set.planExerciseId) === id).sort((a, b) => a.setIndex - b.setIndex);
    const first = sets[0];
    return {
      id,
      exerciseId: String(entry.exerciseId),
      ...(facts.get(String(entry.exerciseId)) && { exercise: facts.get(String(entry.exerciseId)) }),
      sets: sets.length,
      ...(first?.reps !== undefined && { reps: first.reps }),
      ...(first?.durationSec !== undefined && { durationSec: first.durationSec }),
      resolvedSets: sets.map((set) => ({
        setIndex: set.setIndex,
        type: set.type ?? 'working',
        ...(set.reps !== undefined && { reps: set.reps }),
        ...(set.durationSec !== undefined && { durationSec: set.durationSec }),
        ...(set.weight !== undefined && { targetWeight: set.weight }),
      })),
    };
  });
  return { id: String(log._id), title: log.workoutTitle, order: 0, exercises };
}
