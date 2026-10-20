import type { WorkoutStatus } from './index';

// Cardio sessions (run / intervals / walk / bike): a second workout kind next to the strength Plan.
// A session belongs to one trainee; it starts in the plan week it was added to and, when it repeats
// weekly, shows in every later week too. Units: seconds, km. Intensity is stored 1–10; how it is
// shown (RPE "8/10" or a heart-rate zone Z1–Z5) follows the session's metric.

export type CardioSport = 'run' | 'intervals' | 'walk' | 'bike';
export type CardioMetric = 'rpe' | 'pace' | 'speed' | 'hrZone';
export type CardioBlockKind = 'warmup' | 'steady' | 'work' | 'recovery' | 'cooldown';
/** draft = only the coach sees it · active = in her app. */
export type CardioSessionStatus = 'draft' | 'active';

export interface CardioBlock {
  type: 'block';
  /** Client-made, stable while editing (a graph bar and its row share it). */
  id: string;
  kind: CardioBlockKind;
  durationSec: number;
  /** 1–10. */
  intensity: number;
}

export interface CardioRepeatSet {
  type: 'repeat';
  id: string;
  /** 1–30 rounds. */
  times: number;
  blocks: CardioBlock[];
}

export type CardioStep = CardioBlock | CardioRepeatSet;

/** What the coach saves (POST / PUT). */
export interface SaveCardioSessionPayload {
  name: string;
  sport: CardioSport;
  metric: CardioMetric;
  steps: CardioStep[];
  note?: string | null;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  repeatsWeekly: boolean;
  /** The plan week (a Sunday, 'YYYY-MM-DD') it starts in. Fixed after creation. */
  weekStartDate: string;
  status: CardioSessionStatus;
}

export interface CardioSession {
  id: string;
  traineeId: string;
  name: string;
  sport: CardioSport;
  metric: CardioMetric;
  steps: CardioStep[];
  note: string | null;
  days: number[];
  repeatsWeekly: boolean;
  weekStartDate: string;
  status: CardioSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CardioLog {
  id: string;
  sessionId: string;
  /** Copied when saved, so history survives later edits. */
  sessionName: string;
  sport: CardioSport;
  /** The session's day ('YYYY-MM-DD' in her zone). */
  date: string;
  completedSec: number;
  roundsDone: number;
  roundsTotal: number;
  highIntensitySec: number;
  distanceKm: number | null;
  /** 1–10, how hard it felt. */
  rpe: number;
  note: string | null;
  createdAt: string;
}

export interface SaveCardioLogPayload {
  sessionId: string;
  date: string;
  completedSec: number;
  roundsDone: number;
  highIntensitySec: number;
  distanceKm?: number | null;
  rpe: number;
  note?: string | null;
}

/** One day a session falls on, with its status (computed on the server, like a strength workout's). */
export interface CardioOccurrence {
  session: CardioSession;
  date: string;
  dayOfWeek: number;
  status: WorkoutStatus;
  isToday: boolean;
  /** Her log for that day, when done. */
  logId: string | null;
}

/** GET /api/cardio/week */
export interface TraineeCardioWeek {
  weekStartDate: string;
  today: string;
  items: CardioOccurrence[];
}

/** GET /api/cardio/sessions/:id?date= */
export interface TraineeCardioSessionResponse {
  occurrence: CardioOccurrence;
  log: CardioLog | null;
  coach: { name: string } | null;
  /** A day of this week, not logged yet: she can run it (decided on the server). */
  canStart: boolean;
}

/** GET /api/coach/trainees/:id/cardio */
export interface CoachCardioList {
  sessions: CardioSession[];
  /** Newest first. */
  logs: CardioLog[];
}
