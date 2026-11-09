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
  | { type: 'coach_note_thanks'; data: { traineeId: string; traineeName: string; note: CoachNoteId; noteId: string } }
  // coachName is a snapshot taken when the coaching ended.
  | { type: 'coaching_ended'; data: { coachingId: string; coachName: string } }
  // traineeName is a snapshot taken when she ended the coaching herself.
  | { type: 'trainee_ended_coaching'; data: { coachingId: string; traineeId: string; traineeName: string } }
  // A multi-week plan's last week (traineeName is a snapshot from that moment).
  | { type: 'plan_block_ending'; data: { traineeId: string; traineeName: string; blockId: string; weekStartDate: string } };

export interface NotificationDocument {
  userId: Types.ObjectId;
  type: NotificationType;
  data: NotificationPayload['data'];
  dedupeKey: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
