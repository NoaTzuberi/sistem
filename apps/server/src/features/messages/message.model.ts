import { Schema, model, type Types } from 'mongoose';
import type { MessageSender } from '@sistem/types';
import { MAX_MESSAGE_LENGTH, MESSAGE_SENDERS } from './message.constants';

export interface MessageDocument {
  coachingId: Types.ObjectId;
  coachId: Types.ObjectId;
  traineeId: Types.ObjectId;
  sender: MessageSender;
  text: string;
  /** When the other side read it; null = unread. */
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 1:1 messages between a coach and her trainee (coach mode Phase B). A thread = one coaching, so an
// ended coaching's messages are never shown to a later coach. Push delivery comes with Capacitor (5b).
const messageSchema = new Schema<MessageDocument>(
  {
    coachingId: { type: Schema.Types.ObjectId, ref: 'Coaching', required: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: String, enum: MESSAGE_SENDERS, required: true },
    text: { type: String, required: true, trim: true, maxlength: MAX_MESSAGE_LENGTH },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ coachingId: 1, createdAt: -1 });
messageSchema.index({ coachId: 1, sender: 1, readAt: 1 });
messageSchema.index({ traineeId: 1, sender: 1, readAt: 1 });

export const Message = model<MessageDocument>('Message', messageSchema);
