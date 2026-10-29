// Coach mode Phase B: the coach's reactions on the feed and 1:1 messages (coach ↔ trainee).
import type { PrivatePhoto } from './index';

// --- Reactions ------------------------------------------------------------------------

/** 👏 🔥 ❤️ — stored as ids; the screens draw the emoji. */
export type ReactionId = 'clap' | 'fire' | 'heart';

/**
 * What a reaction is on: a finished workout / cardio run (by log id), a Daily Pump photo (by
 * workout log id), or one day of meal / progress photos (by her date 'YYYY-MM-DD').
 */
export type ReactionTargetType = 'workout_log' | 'cardio_log' | 'pump_photo' | 'meal_photos' | 'progress_photos';

/** PUT /coach/trainees/:traineeId/reactions — one reaction per coach per target; null removes it. */
export interface SetReactionPayload {
  targetType: ReactionTargetType;
  targetId: string;
  reaction: ReactionId | null;
}

export interface SetReactionResponse {
  reaction: ReactionId | null;
}

/** A reaction as the trainee sees it (GET /reactions). */
export interface CoachReaction {
  id: string;
  reaction: ReactionId;
  targetType: ReactionTargetType;
  targetId: string;
  /** The workout's title (workout / cardio / pump); null for a day of photos. */
  workoutTitle: string | null;
  /** The workout log to open (workout / pump), else null. */
  logId: string | null;
  coachName: string;
  /** When it was set (ISO). */
  at: string;
  /** She has seen it (POST /reactions/seen). */
  seen: boolean;
}

/** GET /reactions?logId= — newest first, her live coachings only. */
export interface CoachReactionList {
  items: CoachReaction[];
  serverTime: string;
}

// --- Messages ---------------------------------------------------------------------------

export type MessageSender = 'coach' | 'trainee';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  /** Plain text, line breaks kept. */
  text: string;
  createdAt: string;
  /** When the other side read it; null = not yet. */
  readAt: string | null;
}

/** One page of a thread, NEWEST first; pass nextBefore as ?before= for older messages. */
export interface MessagePage {
  items: ChatMessage[];
  nextBefore: string | null;
  serverTime: string;
}

/** POST …/messages */
export interface SendMessagePayload {
  text: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
}

/** GET …/messages/unread, POST …/messages/read: messages to the caller not read yet. */
export interface UnreadMessagesResponse {
  unread: number;
}

/** One row of the coach's Messages tab: a live coaching that has messages. */
export interface CoachThread {
  trainee: { id: string; name: string; avatar: PrivatePhoto | null };
  lastMessage: ChatMessage;
  /** Her messages the coach hasn't read. */
  unread: number;
}

/** GET /coach/messages — newest conversation first. */
export interface CoachThreadList {
  items: CoachThread[];
  unreadTotal: number;
  serverTime: string;
}

/** GET /messages — the trainee's thread with her current coach (no coach: coach null, no items). */
export interface TraineeThreadResponse extends MessagePage {
  coach: { id: string; name: string; avatar: PrivatePhoto | null } | null;
  unread: number;
}
