import type { AppNotification, Language } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill } from './i18n/copy';
import { isolateAuto } from './i18n/bidi';

export interface CoachNotificationView {
  text: string;
  /** The trainee the notification opens; each app builds its own path to her. */
  traineeId: string;
  /**
   * The trainee section to open; null = her default section. Both apps call it 'logs'.
   * 'archive' = her coaching ended: open her read-only archived page instead.
   * 'plans' = her plans (a multi-week plan ends this week: time for the next one).
   */
  section: 'logs' | 'archive' | 'plans' | null;
  /** The type's color family in both apps: 'new' = purple (a person / news), 'done' = Cherry Rose (she did something). */
  tone: CoachNotificationTone;
  /** The type's icon; each app draws it with its own icon set. */
  icon: CoachNotificationIcon;
}

export type CoachNotificationTone = 'new' | 'done';
export type CoachNotificationIcon = 'person' | 'heart' | 'calendar' | 'check';

/** The same icon + color per type in the dashboard bell and the mobile list. */
const LOOKS: Record<string, { tone: CoachNotificationTone; icon: CoachNotificationIcon }> = {
  trainee_onboarded: { tone: 'new', icon: 'person' },
  trainee_ended_coaching: { tone: 'new', icon: 'person' },
  coach_note_thanks: { tone: 'new', icon: 'heart' },
  plan_block_ending: { tone: 'new', icon: 'calendar' },
  workout_completed: { tone: 'done', icon: 'check' },
};

/**
 * Notifications store no wording (type + data only): the coach's text and tap target
 * are built here, in her language, for the dashboard bell and the mobile Inbox alike.
 * Types the coach never receives (or does not know yet) return null and are not shown.
 */
export function describeCoachNotification(notification: AppNotification, language: Language): CoachNotificationView | null {
  const described = describeText(notification, language);
  return described ? { ...described, ...LOOKS[notification.type] } : null;
}

function describeText(notification: AppNotification, language: Language): Omit<CoachNotificationView, 'tone' | 'icon'> | null {
  const copy = sharedCopy[language].coachNotifications;
  if (notification.type === 'trainee_onboarded') {
    return {
      text: fill(copy.traineeOnboarded, { name: isolateAuto(notification.data.traineeName) }),
      traineeId: notification.data.traineeId,
      section: null,
    };
  }
  if (notification.type === 'workout_completed') {
    // Placeholder wording — the owner decides the final text.
    return {
      text: fill(copy.workoutCompleted, {
        name: isolateAuto(notification.data.traineeName),
        workout: isolateAuto(notification.data.workoutTitle),
      }),
      traineeId: notification.data.traineeId,
      section: 'logs',
    };
  }
  if (notification.type === 'coach_note_thanks') {
    // Her "👍 Thanks!" under a note on Home — opens her (no section of its own).
    return {
      text: fill(copy.noteThanks, { name: isolateAuto(notification.data.traineeName) }),
      traineeId: notification.data.traineeId,
      section: null,
    };
  }
  if (notification.type === 'plan_block_ending') {
    return {
      text: fill(copy.planBlockEnding, { name: isolateAuto(notification.data.traineeName) }),
      traineeId: notification.data.traineeId,
      section: 'plans',
    };
  }
  if (notification.type === 'trainee_ended_coaching') {
    return {
      text: fill(copy.traineeEndedCoaching, { name: isolateAuto(notification.data.traineeName) }),
      traineeId: notification.data.traineeId,
      section: 'archive',
    };
  }
  return null;
}

export interface CoachNotificationSubContext {
  nowMs: number;
  /** Still waiting for her first plan (the "filled in the questionnaire…" line is still true). */
  isWaiting: (traineeId: string) => boolean;
  /** Her current week's published plan, as the trainees list has it. */
  weekOf: (traineeId: string) => { planned: number; completed: number } | null | undefined;
}

/**
 * The line under a notification, or undefined: "waiting for a plan" while it is still true, and her
 * week as it stands now — only next to something from today, while it still describes it.
 */
export function describeCoachNotificationSub(
  notification: AppNotification,
  traineeId: string,
  { nowMs, isWaiting, weekOf }: CoachNotificationSubContext,
  language: Language,
): string | undefined {
  const copy = sharedCopy[language].coachNotifications;
  if (notification.type === 'trainee_onboarded') return isWaiting(traineeId) ? copy.waitingForPlan : undefined;
  const week = weekOf(traineeId);
  if (notificationDayGroup(notification.createdAt, nowMs) === 'today' && week && week.planned > 0) {
    return fill(copy.weekSummary, { done: week.completed, planned: week.planned });
  }
  return undefined;
}

export type NotificationDayGroup = 'today' | 'yesterday' | 'earlier';

function localDayStart(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Today / yesterday / earlier, by the device's calendar day (the coach's own day). */
export function notificationDayGroup(iso: string, nowMs: number): NotificationDayGroup {
  const today = localDayStart(nowMs);
  const day = localDayStart(new Date(iso).getTime());
  if (day >= today) return 'today';
  const yesterday = localDayStart(today - 1);
  return day >= yesterday ? 'yesterday' : 'earlier';
}
