import type { CopyShape } from '@sistem/shared';
import type { he } from './he';

// PLACEHOLDER English for the cardio editor and the "+ workout" menu.
export const en: CopyShape<typeof he> = {
  sportLabel: 'Type',
  metricLabel: 'How intensity is measured',
  metricGroup: 'Measure',
  total: 'Total time',
  high: 'High intensity',
  rounds: 'Rounds',
  graphLabel: 'Intensity over the session',
  structure: 'Session structure',
  structureHint: 'Click a block name or a graph bar to open it',
  add: { warmup: 'Warm-up', steady: 'Block', repeat: 'Repeat set', cooldown: 'Cool-down' },
  lessTime: 'Less time',
  moreTime: 'More time',
  minutes: 'min',
  lessIntensity: 'Less intensity',
  moreIntensity: 'More intensity',
  deleteBlock: 'Delete block',
  deleteRepeat: 'Delete repeat set',
  repeatTitle: 'Repeat set',
  lessRounds: 'Fewer rounds',
  moreRounds: 'More rounds',
  perRound: '{round} per round · {total} total',
  kindLabel: 'Block type',
  menuLabel: 'Workout type',
  menuStrength: 'Strength workout',
  menuStrengthHint: 'Exercises, sets and reps',
  menuCardio: 'Cardio workout',
  menuCardioHint: 'Run, intervals, walk or bike',
};
