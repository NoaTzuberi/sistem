import type { Language, PlanIssue } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill } from './i18n/copy';

/** 'Workout 2, exercise 1: …' — where the server says a refused plan is wrong (the message is already in her language). */
export function describeIssue(issue: PlanIssue, language: Language): string {
  const copy = sharedCopy[language].coach;
  const where = [
    ...(issue.blockWeek !== undefined ? [fill(copy.issueWeek, { n: issue.blockWeek })] : []),
    ...(issue.workoutIndex !== undefined ? [fill(copy.issueWorkout, { n: issue.workoutIndex + 1 })] : []),
    ...(issue.exerciseIndex !== undefined ? [fill(copy.issueExercise, { n: issue.exerciseIndex + 1 })] : []),
  ].join(sharedCopy[language].common.listSeparator);
  return where ? fill(copy.issueAt, { where, message: issue.message }) : issue.message;
}
