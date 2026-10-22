import type { AppNotification, Language } from '@sistem/types';
import { sharedCopy } from './copy';
import { fill } from './i18n/copy';
import { isolateAuto } from './i18n/bidi';

export interface CoachNotificationView {
  text: string;
  /** The trainee the notification opens; each app builds its own path to her. */
  traineeId: string;
  /** The trainee section to open; null = her default section. Both apps call it 'logs'. */
  section: 'logs' | null;
}

/**
 * Notifications store no wording (type + data only): the coach's text and tap target
 * are built here, in her language, for the dashboard bell and the mobile Inbox alike.
 * Types the coach never receives (or does not know yet) return null and are not shown.
 */
export function describeCoachNotification(notification: AppNotification, language: Language): CoachNotificationView | null {
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
  return null;
}
