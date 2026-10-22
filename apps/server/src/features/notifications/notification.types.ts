import type { Types } from 'mongoose';
import type { CoachNoteId, NotificationType } from '@sistem/types';

/**
 * What callers pass to notify(). No wording here: the screens build the text and
 * the tap target from `type` + `data`.
 */
export type NotificationPayload =
  // traineeName is a snapshot taken when the notification is created.
  | { type: 'trainee_onboarded'; data: { traineeId: string; traineeName: string } }
  | { type: 'plan_published'; data: { planId: string; weekStartDate: string } }
  | { type: 'workout_completed'; data: { traineeId: string; traineeName: string; logId: string; workoutTitle: string } }
  | { type: 'nutrition_plan_published'; data: { planId: string; version: number; isUpdate: boolean } }
  // noteId = the plan id (plan notes) or the nutrition version id (its intro): one thanks per note.
  | { type: 'coach_note_thanks'; data: { traineeId: string; traineeName: string; note: CoachNoteId; noteId: string } };

export interface NotificationDocument {
  userId: Types.ObjectId;
  type: NotificationType;
  data: NotificationPayload['data'];
  dedupeKey: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
