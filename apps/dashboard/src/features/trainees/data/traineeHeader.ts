import type { CoachTraineeDetail, Language } from '@sistem/types';
import { ageOn, fill, isolateAuto, isolateLtr, labelList, sharedCopy, todayInTimezone } from '@sistem/shared';
import { traineesCopy } from '../copy';

/** The 48h window in milliseconds (PRD §4.1) — only to draw how much of it has passed. */
const PLAN_WINDOW_MS = 48 * 60 * 60 * 1000;

/** How much of the 48h window is used up, 0–1 (1 once it has passed). `nowMs` = the server's clock. */
export function planWindowFraction(planDueAt: string, nowMs: number): number {
  const leftMs = new Date(planDueAt).getTime() - nowMs;
  return Math.max(0, Math.min(1, 1 - leftMs / PLAN_WINDOW_MS));
}

export interface TraineeHeaderChips {
  /** Her goals and training days — from her own onboarding answers. */
  facts: string[];
  /** One per recovery flag she reported (an injury or a limitation). */
  flags: string[];
}

/**
 * The chips under her name: the coaching's discipline (when set), her age, goals and training days.
 * Only what exists: a missing answer gives no chip.
 */
export function traineeHeaderChips(trainee: CoachTraineeDetail, language: Language, now: Date = new Date()): TraineeHeaderChips {
  const options = sharedCopy[language].onboardingOptions;
  const answers = trainee.onboarding?.answers;
  const frequency = answers?.trainingFrequency;
  const days = frequency ? (frequency.minDays === frequency.maxDays ? String(frequency.minDays) : isolateLtr(`${frequency.minDays}–${frequency.maxDays}`)) : undefined;
  return {
    facts: [
      trainee.discipline ? isolateAuto(trainee.discipline) : undefined,
      answers?.birthDate ? fill(traineesCopy[language].ageChip, { age: ageOn(answers.birthDate, todayInTimezone(trainee.timezone, now)) }) : undefined,
      answers?.goals && answers.goals.length > 0 ? labelList(answers.goals, options.goals, language) : undefined,
      days ? fill(traineesCopy[language].daysPerWeek, { days }) : undefined,
    ].filter((chip): chip is string => chip !== undefined),
    flags: (answers?.recovery?.flags ?? []).map((flag) => (options.recoveryFlags as Record<string, string>)[flag] ?? flag),
  };
}
